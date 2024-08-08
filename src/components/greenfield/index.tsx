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
import { useState } from "react";
import { useAccount } from "wagmi";

export const Greenfield = ({ data }) => {
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

  return (
    <>
      <section className="section">
        <div className="container">
          <h1 className="title">Greenfield Storage Demo</h1>
          <p className="subtitle">
            Create Bucket / Create Object / Upload File / Download File
          </p>
        </div>
      </section>

      <div className="box">
        <div className="field is-horizontal">
          <div className="field-label is-normal">
            <label className="label">Bucket</label>
          </div>
          <div className="field-body">
            <div className="field">
              <div className="control">
                <input
                  className="input"
                  type="text"
                  value={info.bucketName}
                  placeholder="bucket name"
                  onChange={(e) => {
                    setInfo({ ...info, bucketName: e.target.value });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="field">
          <button
            className={"button is-primary"}
            onClick={async () => {
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
            }}
          >
            Create Bucket Tx
          </button>
        </div>
      </div>

      <div className="box">
        <div className="field is-horizontal">
          <div className="field-label is-normal">
            <label className="label">Object</label>
          </div>
          <div className="field-body">
            <div className="field">
              <div className="control">
                <input
                  className="input"
                  type="text"
                  value={info.objectName}
                  placeholder="object name"
                  onChange={(e) => {
                    setInfo({ ...info, objectName: e.target.value });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* upload */}
        <div className="field">
          <button
            className="button is-primary"
            onClick={async () => {
              if (!address && !data) return;

              const spInfo = await selectSp();
              console.log("spInfo", spInfo);

              const provider = await connector?.getProvider();
              const offChainData = await getOffchainAuthKeys(address, provider);
              if (!offChainData) {
                alert("No offchain, please create offchain pairs first");
                return;
              }

              function stringToUint(string) {
                var string = btoa(unescape(encodeURIComponent(string))),
                  charList = string.split(""),
                  uintArray = [];
                for (var i = 0; i < charList.length; i++) {
                  uintArray.push(charList[i].charCodeAt(0));
                }
                return new Uint8Array(uintArray);
              }

              try {
                const rs = new ReedSolomon();
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const fileBytes = await blob.arrayBuffer();

                // console.log(JSON.stringify(data));
                const expectCheckSums = rs.encode(new Uint8Array(fileBytes));

                console.log("rs", expectCheckSums);

                const createPostTx = await client.object.createObject({
                  bucketName: info.bucketName,
                  objectName: info.objectName,
                  creator: address,
                  visibility: VisibilityType.VISIBILITY_TYPE_PRIVATE,
                  contentType: "application/json",
                  redundancyType: RedundancyType.REDUNDANCY_EC_TYPE,
                  payloadSize: Long.fromInt(fileBytes.byteLength),
                  expectChecksums: expectCheckSums.map((x) =>
                    bytesFromBase64(x)
                  ),
                });

                const simulateInfo = await createPostTx.simulate({
                  denom: "BNB",
                });

                console.log("simulateInfo", simulateInfo);

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
                      body: blob,
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
            }}
          >
            Save Post
          </button>
        </div>
      </div>
    </>
  );
};
