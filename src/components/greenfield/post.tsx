import { client, selectSp } from "@/client";
import { getOffchainAuthKeys } from "@/utils/offchainAuth";
import {
  bytesFromBase64,
  Long,
  OnProgressEvent,
  RedundancyType,
  VisibilityType,
} from "@bnb-chain/greenfield-js-sdk";
import { ReedSolomon } from "@bnb-chain/reed-solomon";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export const PostGreenfield = ({
  children,
  data,
  objectInfo = null,
  readOnly = false,
}) => {
  const { address, connector } = useAccount();
  const [info, setInfo] = useState<{
    bucketName: string;
    objectName: string;
    postTitle: string;
    file: File | null;
  }>({
    bucketName: objectInfo ? objectInfo.bucketName : "",
    objectName: objectInfo ? objectInfo.objectName : "",
    postTitle: objectInfo ? objectInfo.postTitle : "",
    file: null,
  });

  const [postOrigName, setPostOrigName] = useState("");

  const [txHash, setTxHash] = useState<string>();
  const router = useRouter();

  useEffect(() => {
    if (
      !objectInfo ||
      objectInfo.bucketName === "" ||
      objectInfo.objectName === ""
    )
      return;

    client.object
      .headObject(objectInfo.bucketName, objectInfo.objectName)
      .then((res: any) => {
        setPostOrigName(res.objectInfo.objectName);
      });
  }, [objectInfo]);

  const createPost = async () => {
    if (!address && !data) return;

    const spInfo = await selectSp();
    // console.log("spInfo", spInfo);

    const provider = await connector?.getProvider();
    const offChainData = await getOffchainAuthKeys(address, provider);
    if (!offChainData) {
      alert("No offchain, please create offchain pairs first");
      return;
    }

    try {
      // Check if object exists
      if (postOrigName) {
        console.log("Hhhh", postOrigName);
        const deleteObjectTx = await client.object.deleteObject({
          bucketName: info.bucketName,
          objectName: postOrigName,
          operator: address,
        });

        const simulateInfo = await deleteObjectTx.simulate({
          denom: "BNB",
        });

        const res = await deleteObjectTx.broadcast({
          denom: "BNB",
          gasLimit: Number(simulateInfo?.gasLimit),
          gasPrice: simulateInfo?.gasPrice || "5000000000",
          payer: address,
          granter: "",
        });
      }

      const rs = new ReedSolomon();
      console.log("Info ", info)
      const payload = {
        title: info.postTitle,
        payload: data.payload,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const fileBytes = await blob.arrayBuffer();

      const expectCheckSums = rs.encode(new Uint8Array(fileBytes));

      const createPostTx = await client.object.createObject({
        bucketName: info.bucketName,
        objectName: info.objectName,
        creator: address,
        visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
        contentType: "application/json",
        redundancyType: RedundancyType.REDUNDANCY_EC_TYPE,
        payloadSize: Long.fromInt(fileBytes.byteLength),
        expectChecksums: expectCheckSums.map((x) => bytesFromBase64(x)),
      });

      const simulateInfo = await createPostTx.simulate({
        denom: "BNB",
      });

      const res = await createPostTx.broadcast({
        denom: "BNB",
        gasLimit: Number(simulateInfo?.gasLimit),
        gasPrice: simulateInfo?.gasPrice || "5000000000",
        payer: address,
        granter: "",
      });

      if (res.code === 0) {
        alert("create object success");

        setTxHash(res.transactionHash);

        const uploadRes = await client.object.uploadObject(
          {
            bucketName: info.bucketName,
            objectName: info.objectName,
            body: blob as File,
            txnHash: txHash,
            duration: 20000,
            onProgress: (e: OnProgressEvent) => {
              console.log("progress: ", e.percent);
            },
          },
          {
            type: "EDDSA",
            domain: window.location.origin,
            seed: offChainData.seedString,
            address,
          }
        );
        console.log("uploadRes", uploadRes);

        if (uploadRes.code === 0) {
          alert("success");
          router.push("/dashboard/posts/" + info.bucketName);
        }
      }
    } catch (err) {
      console.log(typeof err);
      if (err instanceof Error) {
        alert(err.message);
      }
      if (err && typeof err === "object") {
        alert(JSON.stringify(err));
      }
    }
  };

  return (
    <div className="py-10">
      <div className="px-4 py-2 sm:px-0">
        <h3 className="text-3xl font-semibold leading-7 text-gray-900">Post</h3>

        <p className="mt-2 max-w-2xl text-base leading-6 text-gray-500">
          Manage your post
        </p>
      </div>

      <div className="mt-3 border-t border-gray-100">
        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <div className="text-base font-medium leading-6 text-gray-900">
            Website (Bucket)
          </div>
          <div className="mt-1 text-base leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
            {info.bucketName}
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-gray-100">
        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <label
            htmlFor="postid"
            className="text-base font-medium leading-6 text-gray-900"
          >
            Post ID
          </label>
          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 sm:max-w-md">
            <input
              type="text"
              name="postid"
              id="postid"
              value={info.objectName}
              className="input"
              placeholder="Post-id"
              onChange={(e) => {
                setInfo({ ...info, objectName: e.target.value });
              }}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-gray-100">
        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <label
            htmlFor="postTitle"
            className="text-base font-medium leading-6 text-gray-900"
          >
            Title
          </label>
          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 sm:max-w-md">
            <input
              type="text"
              name="postTitle"
              id="postTitle"
              value={info.postTitle}
              className="input"
              placeholder="Post Title"
              onChange={(e) => {
                setInfo({ ...info, postTitle: e.target.value });
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-gray-100">
        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <label
            htmlFor="postid"
            className="text-base font-medium leading-6 text-gray-900"
          >
            Visibility
          </label>
          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 sm:max-w-md">
            <input
              type="text"
              name="visibility"
              id="visibility"
              value="Public"
              className="input"
              placeholder="Visiblity"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Editorjs */}
      <div className="pt-6 pb-4 sm:px-0 sm:gap-4">{children}</div>

      {readOnly ? (
        <div className="mt-4 border-t border-gray-100">
          <div className="mt-4 flex items-center justify-end gap-x-6">
            <button
              onClick={() => {
                router.push("/dashboard");
              }}
              className="text-base font-semibold leading-6 text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 border-t border-gray-100">
          <div className="mt-4 flex items-center justify-end gap-x-6">
            <button
              onClick={() => {
                router.push("/dashboard");
              }}
              className="text-base font-semibold leading-6 text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={createPost}
              className="rounded-md bg-green-600 px-3 py-2 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
