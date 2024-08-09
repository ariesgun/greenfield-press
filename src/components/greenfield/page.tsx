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
import { useState } from "react";
import { useAccount } from "wagmi";

export const PageGreenfield = ({ data }) => {
  const { address, connector } = useAccount();
  const [info, setInfo] = useState<{
    bucketName: string;
    objectName: string;
    file: File | null;
  }>({
    bucketName: "helllo-world-test-xeo",
    objectName: "",
    file: null,
  });

  const [txHash, setTxHash] = useState<string>();
  const router = useRouter();

  const createBucket = async () => {
    if (!address) return;

    const spInfo = await selectSp();
    console.log("spInfo", spInfo);

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
              value={info.objectName}
              className="input"
              placeholder="post name"
              onChange={(e) => {
                setInfo({ ...info, objectName: e.target.value });
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
