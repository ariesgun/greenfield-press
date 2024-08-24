//@ts-nocheck

import { client, selectSp } from "@/client";
import { getOffchainAuthKeys } from "@/utils/offchainAuth";
import { toSvg } from "jdenticon";
import moment from "moment";
import Image from "next/image";
import { useRouter } from "next/router";
import { Octokit } from "octokit";
import React, { FormEvent, useEffect, useRef, useState } from "react";
import {
  useAccount,
  useContractWrite,
  useNetwork,
  usePrepareContractWrite,
  useSwitchNetwork,
} from "wagmi";
import { bnbRegistryABI } from "../contracts/bnbRegistry";
import { resolverABI } from "../contracts/resolver";
import Web3 from "web3";
import { encodeDNSRecord } from "@/utils/dnsUtil";
import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import { ReedSolomon } from "@bnb-chain/reed-solomon";
import {
  bytesFromBase64,
  Long,
  RedundancyType,
  VisibilityType,
} from "@bnb-chain/greenfield-js-sdk";
import { BSC_CHAIN_ID } from "@/config/env";

const registryAddress = "0x08ced32a7f3eec915ba84415e9c07a7286977956";
const resolverAddress = "0xE4429DEd21a6e7bf7d187CeD5b74c40Cd27f0190";

const bnbTestnetURL =
  "https://bsc-testnet.infura.io/v3/1ddf63d5b50c465999dee923349bf352";
const bnbMainnetURL =
  "https://bsc-mainnet.infura.io/v3/1ddf63d5b50c465999dee923349bf352";

export function Dashboard({ bucket }: { bucket: string | string[] }) {
  const { address, connector } = useAccount();
  const { chain, chains } = useNetwork();
  const { data, isLoading, isSuccess, writeAsync } = useContractWrite({});
  const { switchNetwork } = useSwitchNetwork();

  const web3 = new Web3(bnbMainnetURL);

  enum WebsiteType {
    Blog = "Blog",
    Custom = "Custom"
  }

  const [info, setInfo] = useState<{
    bucketName: string | string[];
    websiteType: WebsiteType;
    prefix: string
  }>({
    bucketName: bucket,
    websiteType: WebsiteType.Custom,
    prefix: ""
  });

  const [posts, setPosts] = useState<any[]>([]);
  const [bnbName, setBnbName] = useState("");

  const router = useRouter();

  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(),
  });

  useEffect(() => {
    if (!address) return;

    const findInfo = async (bucketName) => {
      if (!bucketName) return;

      try {
        const provider = await connector?.getProvider();
        const offChainData = await getOffchainAuthKeys(address, provider);
        if (!offChainData) {
          alert("No offchain, please create offchain pairs first");
          return;
        }

        // Check if object exists
        const objectName = ".info";
        const postOrigName = await client.object.getObject(
          {
            bucketName: bucketName as string,
            objectName: objectName,
          },
          {
            type: "EDDSA",
            address,
            domain: window.location.origin,
            seed: offChainData.seedString,
          }
        );
        console.log(postOrigName)
        const payload = JSON.parse(await postOrigName.body.text());
        setBnbName(payload.bnb);
        setInfo({ ...info, bucketName: bucketName, websiteType: payload.type, prefix: payload.type === WebsiteType.Custom ? "" : "gnfd-press" })
        console.log("COntent: ", payload, info);
      } catch (error) {
        console.log("File does not exists", error);
      }
    };

    const listPosts = async () => {
      const spInfo = await selectSp();
      console.log("spInfo", spInfo);

      const provider = await connector?.getProvider();
      const offChainData = await getOffchainAuthKeys(address, provider);
      if (!offChainData) {
        alert("No offchain, please create offchain pairs first");
        return;
      }

      try {
        const listObjectsTx = await client.object.listObjects({
          bucketName: bucket as string,
          endpoint: spInfo.endpoint,
        });

        if (listObjectsTx.code === 0) {
          console.log(listObjectsTx.body);

          const objects =
            listObjectsTx?.body?.GfSpListObjectsByBucketNameResponse.Objects!;
          console.log(objects);

          objects.forEach((el) => {
            if (el.ObjectInfo.ObjectName !== ".info") {
              const svgString = toSvg(el.ObjectInfo.ObjectName, 100);
              // console.log(svgString);
              setPosts((posts) => [
                ...posts,
                {
                  id: el.ObjectInfo.Id,
                  bucketName: el.ObjectInfo.BucketName,
                  objectName: el.ObjectInfo.ObjectName,
                  owner: el.ObjectInfo.Owner,
                  creator: el.ObjectInfo.Creator,
                  createdAt: el.ObjectInfo.CreateAt,
                  avatar: svgString,
                },
              ]);
            }
          });
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

    setInfo({ ...info, bucketName: bucket });
    findInfo(bucket);
    setPosts([]);
    listPosts();
  }, [address, bucket]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    console.log("OK", formData.get("name"));
    const response = await fetch("/api/submit", {
      method: "POST",
      body: formData.get("name"),
    });

    // Handle response if necessary
    const data = await response.json();

    alert("Website is being built...");
  };

  const uploadInfo = async () => {
    if (!address) return;

    const provider = await connector?.getProvider();
    const offChainData = await getOffchainAuthKeys(address, provider);
    if (!offChainData) {
      alert("No offchain, please create offchain pairs first");
      return;
    }

    const objectName = ".info";
    let postOrigName = null;
    try {
      // Check if object exists
      postOrigName = await client.object.headObject(
        info.bucketName as string,
        objectName
      );
    } catch (err) {
      console.log(".info not found");
    }

    try {
      if (postOrigName) {
        console.log("Hhhh", postOrigName);
        const deleteObjectTx = await client.object.deleteObject({
          bucketName: info.bucketName as string,
          objectName: objectName,
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
      const payload = {
        bnb: bnbName,
        type: info.websiteType
      };
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
        console.log("uploadRes", uploadRes);

        if (uploadRes.code === 0) {
          alert("success linking BNB NS");
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

  const onSwitchNetwork = () => {
    switchNetwork(BSC_CHAIN_ID);
  };

  const linkBnb = async () => {
    if (bnbName.split(".").length < 2) {
      alert("Please enter a valid BNB ID");
      return;
    }

    const name = web3.utils.keccak256(bnbName.split(".")[0]);
    const baseNode =
      "0xdba5666821b22671387fe7ea11d7cc41ede85a5aa67c3e7b3d68ce6a661f389c";
    const nodehash = Web3.utils.keccak256(
      web3.utils.encodePacked(baseNode, name)
    );

    console.log(nodehash);

    try {
      const res1 = await writeAsync({
        address: registryAddress,
        abi: bnbRegistryABI,
        functionName: "setResolver",
        args: [nodehash, resolverAddress],
        onError(error) {
          console.log("Error", error);
        },
      });
      const transaction1 = await publicClient.waitForTransactionReceipt({
        hash: res1.hash,
        confirmations: 5,
      });
      const res2 = await writeAsync({
        address: resolverAddress,
        abi: resolverABI,
        functionName: "setAddr",
        args: [nodehash, address],
        onError(error) {
          console.log("Error", error);
        },
      });
      const transaction2 = await publicClient.waitForTransactionReceipt({
        hash: res2.hash,
        confirmations: 5,
      });
      const dnsRecords = encodeDNSRecord(
        bnbName,
        info.bucketName as string,
        web3
      );
      const res3 = await writeAsync({
        address: resolverAddress,
        abi: resolverABI,
        functionName: "setDNSRecords",
        args: [nodehash, dnsRecords],
        onError(error) {
          console.log("Error", error);
        },
      });
      const transaction3 = await publicClient.waitForTransactionReceipt({
        hash: res3.hash,
        confirmations: 5,
      });
      await uploadInfo();
    } catch (error) {
      alert("Error..." + error);
    }
  };

  return (
    <div>
      <div className="pt-10 pb-2 sm:px-0 flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-3xl font-semibold leading-7 text-gray-900">
            Post Dashboard
          </h3>
          <p className="mt-2 max-w-2xl text-base leading-6 text-gray-500">
            Manage your posts
          </p>
        </div>
        <div className="mb-4 flex items-center justify-end gap-x-4">


          {
            info.websiteType === WebsiteType.Blog ?
              <>
                <form onSubmit={onSubmit}>
                  <input
                    type="text"
                    name="name"
                    readOnly
                    hidden
                    value={info.bucketName}
                    onChange={(e) => {
                      setInfo({ ...info, bucketName: e.target.value });
                    }}
                  />
                  <button
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    type="submit"
                  >
                    Publish/ Update Website
                  </button>
                </form>
                <button
                  className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  onClick={() => {
                    router.push(`/dashboard/posts/${info.bucketName}/post/`);
                  }}
                >
                  Create Post
                </button>
              </>
              : <></>
          }
        </div>
      </div>

      <div className="pt-4">
        <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <div className="text-base font-medium leading-6 text-gray-900">
            Website (Bucket)
          </div>
          <div className="mt-1 text-base leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
            {info.bucketName}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <div className="text-base font-medium leading-6 text-gray-900 content-center">
            Type
          </div>
          <div className="mt-1 text-base leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
            <div id="websiteType" className="w-full sm:max-w-md bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5">
              {info.websiteType}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <div className="text-base font-medium leading-6 text-gray-900 content-center">
            GNFD URL
          </div>
          <div className="mt-1 text-base leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
            <div className="flex flex-col gap-y-4">
              <div>
                <a
                  href={`https://gnfd-testnet-sp2.nodereal.io/view/${info.prefix}${info.bucketName}/index.html`}
                  className="text-blue-600 hover:text-blue-500"
                >
                  {`https://gnfd-testnet-sp2.nodereal.io/view/${info.prefix}${info.bucketName}/index.html`}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-100">
        <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <div className="text-base font-medium leading-6 text-gray-900 content-center">
            .bnb Name Service URL
          </div>

          <div className="mt-1 text-base leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
            <div className="flex flex-col gap-y-4 content-center">
              {bnbName !== "" && (
                <div>
                  <a
                    href={`https://${bnbName.split(".")[0]}.gnfd.xyz`}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    {`https://${bnbName.split(".")[0]}.gnfd.xyz`}
                  </a>
                </div>
              )}
              <div className="flex flex-row gap-x-4">
                <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 sm:max-w-md">
                  <input
                    type="text"
                    name="bnbName"
                    id="bnbName"
                    value={bnbName}
                    className="input"
                    placeholder="BNB ID"
                    onChange={(e) => {
                      // setInfo({ ...info, objectName: e.target.value });
                      setBnbName(e.target.value);
                    }}
                  />
                </div>
                {chain.id === BSC_CHAIN_ID && (
                  <button
                    className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={linkBnb}
                  >
                    {bnbName === "" ? `Link BNB ID` : `Update BNB ID`}
                  </button>
                )}
                {chain.id !== BSC_CHAIN_ID && (
                  <button
                    className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={onSwitchNetwork}
                  >
                    Switch Network to BNB
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div >

      {info.websiteType === WebsiteType.Custom ?
        <div className="pt-8 mb-3">
          <span className="text-gray-500 dark:text-gray-800">Please go to </span>
          <a
            href={`https://testnet.dcellar.io/buckets/${info.bucketName}`}
            className="text-blue-600 hover:text-blue-500">
            {`https://testnet.dcellar.io/buckets/${info.bucketName}`}
          </a>
          <span className="text-gray-500 dark:text-gray-800"> to upload your static HTML files.</span>
        </div> : <></>
      }

      <ul role="list" className="divide-y divide-gray-100 mt-8">
        {posts.length > 0 &&
          posts.map((el) => (
            <li
              key={el.objectName}
              className="flex justify-between gap-x-6 py-5 items-center"
            >
              <div className="flex min-w-0 gap-x-4">
                <Image
                  className="h-12 w-12 flex-none rounded-full bg-gray-50"
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(
                    el.avatar
                  )}`}
                  alt=""
                  width={256}
                  height={256}
                />

                <div className="min-w-0 flex-auto">
                  <p className="text-base font-semibold leading-6 text-gray-900">
                    {el.objectName}
                  </p>
                  <p className="mt-1 truncate text-sm leading-5 text-gray-500">
                    Created at{" "}
                    {moment.unix(el.createdAt).format("YYYY-MM-DDTHH:MMZ")}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex flex-row gap-6">
                <a
                  href={`/dashboard/posts/${el.bucketName}/post/view/${el.id}`}
                  className="text-blue-600 hover:text-blue-500"
                >
                  View
                </a>
                <a
                  href={`/dashboard/posts/${el.bucketName}/post/edit/${el.id}`}
                  className="text-green-600 hover:text-green-500"
                >
                  Edit
                </a>
                <a
                  href="#"
                  className="text-red-600 hover:text-red-500"
                  onClick={async (e) => {
                    try {
                      const tx = await client.object.deleteObject({
                        bucketName: el.bucketName,
                        objectName: el.objectName,
                        operator: address,
                      });
                      const simulateTx = await tx.simulate({
                        denom: "BNB",
                      });

                      const res = await tx.broadcast({
                        denom: "BNB",
                        gasLimit: Number(simulateTx?.gasLimit),
                        gasPrice: simulateTx?.gasPrice || "5000000000",
                        payer: address,
                        granter: "",
                      });
                    } catch (err) {
                      alert("Cannot delete object");
                    }
                  }}
                >
                  Delete
                </a>
              </div>
            </li>
          ))}
      </ul>
    </div >
  );
}
