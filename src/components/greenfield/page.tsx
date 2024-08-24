import { client, selectSp } from "@/client";
import { getOffchainAuthKeys } from "@/utils/offchainAuth";
import {
  bytesFromBase64,
  Long,
  OnProgressEvent,
  RedundancyType,
  VisibilityType,
} from "@bnb-chain/greenfield-js-sdk";
import { GRNToString, newBucketGRN, PermissionTypes } from '@bnb-chain/greenfield-js-sdk';


import { ReedSolomon } from "@bnb-chain/reed-solomon";
import { useRouter } from "next/router";
import { useState } from "react";
import { useAccount } from "wagmi";


enum WebsiteType {
  Blog,
  Custom
}

export const PageGreenfield = ({ data }) => {
  const { address, connector } = useAccount();
  const [info, setInfo] = useState<{
    bucketName: string;
    websiteType: keyof typeof WebsiteType
    file: File | null;
  }>({
    bucketName: "",
    websiteType: "Blog" as keyof typeof WebsiteType,
    file: null,
  });

  const [txHash, setTxHash] = useState<string>();
  const router = useRouter();

  const createBucket = async () => {
    if (!address) return;

    const spInfo = await selectSp();
    console.log("spInfo", spInfo, info.bucketName);

    const provider = await connector?.getProvider();
    const offChainData = await getOffchainAuthKeys(address, provider);
    if (!offChainData) {
      alert("No offchain, please create offchain pairs first");
      return;
    }

    try {
      const createBucketTx = await client.bucket.createBucket({
        bucketName: info.bucketName,
        creator: address,
        primarySpAddress: spInfo.primarySpAddress,
        visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
        chargedReadQuota: Long.fromString("0"),
        paymentAddress: address,
      });

      const simulateInfo = await createBucketTx.simulate({
        denom: "BNB",
      });

      console.log("simulateInfo", simulateInfo);

      const res = await createBucketTx.broadcast({
        denom: "BNB",
        gasLimit: Number(simulateInfo?.gasLimit),
        gasPrice: simulateInfo?.gasPrice || "5000000000",
        payer: address,
        granter: "",
      });

      if (res.code === 0) {
        alert("success");
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

    try {
      // Update policy
      const statement: PermissionTypes.Statement = {
        effect: PermissionTypes.Effect.EFFECT_ALLOW,
        actions: [PermissionTypes.ActionType.ACTION_UPDATE_BUCKET_INFO, PermissionTypes.ActionType.ACTION_DELETE_OBJECT, PermissionTypes.ActionType.ACTION_CREATE_OBJECT],
        resources: [GRNToString(newBucketGRN(info.bucketName))],
      };
      const tx = await client.bucket.putBucketPolicy(info.bucketName, {
        operator: address,
        statements: [statement],
        principal: {
          type: PermissionTypes.PrincipalType.PRINCIPAL_TYPE_GNFD_ACCOUNT,
          value: '0x10d54c326631c0097773D6b4e5F5Ce95d7e535f5',
        },
      });

      const simulateInfo = await tx.simulate({
        denom: "BNB",
      });

      console.log("simulateInfo", simulateInfo);

      const res = await tx.broadcast({
        denom: "BNB",
        gasLimit: Number(simulateInfo?.gasLimit),
        gasPrice: simulateInfo?.gasPrice || "5000000000",
        payer: address,
        granter: "",
      });

      if (res.code === 0) {
        alert("success");
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

    // Create the .info file
    const objectName = ".info";
    try {
      const rs = new ReedSolomon();
      const payload = {
        bnb: "",
        type: info.websiteType
      };
      console.log(payload)
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const fileBytes = await blob.arrayBuffer();

      const expectCheckSums = rs.encode(new Uint8Array(fileBytes));

      const createPostTx = await client.object.createObject({
        bucketName: info.bucketName as string,
        objectName: objectName,
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
        const uploadRes = await client.object.uploadObject(
          {
            bucketName: info.bucketName as string,
            objectName: objectName,
            body: blob as File,
            txnHash: res.transactionHash,
            duration: 20000,
          },
          {
            type: "EDDSA",
            domain: window.location.origin,
            seed: offChainData.seedString,
            address,
          }
        );

        if (uploadRes.code === 0) {
          alert("success");
          router.push('/dashboard')
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
        <h3 className="text-3xl font-semibold leading-7 text-gray-900">
          Website
        </h3>

        <p className="mt-2 max-w-2xl text-base leading-6 text-gray-500">
          Create a new website
        </p>
      </div>

      <div className="mt-3 border-t border-gray-100">
        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <label
            htmlFor="postid"
            className="text-base font-medium leading-6 text-gray-900"
          >
            Website (Bucket)
          </label>
          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 sm:max-w-md">
            <input
              type="text"
              name="postid"
              id="postid"
              value={info.bucketName}
              className="input"
              placeholder="post name"
              onChange={(e) => {
                setInfo({ ...info, bucketName: e.target.value });
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <div className="text-base font-medium leading-6 text-gray-900 content-center">
            Type
          </div>
          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 sm:max-w-md">
            <select id="websiteType" className="rounded w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5"
              value={info.websiteType}
              onChange={e => {
                console.log(e.target.value)
                setInfo({ ...info, websiteType: e.target.value as keyof typeof WebsiteType });
              }}
            >
              <option value="Blog">Blogpost</option>
              <option value="Custom">Custom - Upload your own html files</option>
            </select>
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
            onClick={createBucket}
            className="rounded-md bg-green-600 px-3 py-2 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
