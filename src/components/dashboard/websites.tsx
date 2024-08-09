import { client, selectSp } from "@/client";
import { getOffchainAuthKeys } from "@/utils/offchainAuth";
import { toSvg } from "jdenticon";
import moment from "moment";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

export function WebsitesDashboard() {
  const { address, connector } = useAccount();
  const [info, setInfo] = useState<{
    bucketName: string;
    objectName: string;
  }>({
    bucketName: "helllo-world-test-xeo",
    objectName: "",
  });

  const [buckets, setBuckets] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!address) return;

    const listBuckets = async () => {
      const spInfo = await selectSp();
      console.log("spInfo", spInfo);

      const provider = await connector?.getProvider();
      const offChainData = await getOffchainAuthKeys(address, provider);
      if (!offChainData) {
        alert("No offchain, please create offchain pairs first");
        return;
      }

      try {
        const listBucketsTx = await client.bucket.listBuckets({
          address: address,
          endpoint: spInfo.endpoint,
        });

        if (listBucketsTx.code === 0) {
          const bucketsInfo = listBucketsTx.body;
          //   console.log(bucketsInfo);

          bucketsInfo.forEach((el) => {
            const svgString = toSvg(el.BucketInfo.BucketName, 100);
            // console.log(svgString);
            setBuckets((buckets) => [
              ...buckets,
              {
                id: el.BucketInfo.Id,
                bucketName: el.BucketInfo.BucketName,
                owner: el.BucketInfo.Owner,
                paymentAddress: el.BucketInfo.PaymentAddress,
                createdAt: el.BucketInfo.CreateAt,
                updatedAt: el.UpdateTime,
                avatar: svgString,
              },
            ]);
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

    setBuckets([]);
    listBuckets();
  }, [address]);

  return (
    <div>
      <div className="pt-10 pb-2 sm:px-0 flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-3xl font-semibold leading-7 text-gray-900">
            Dashboard
          </h3>
          <p className="mt-2 max-w-2xl text-base leading-6 text-gray-500">
            Manage your websites on Greenfield
          </p>
        </div>
        <div className="mb-4 flex items-center justify-end">
          <button
            className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              router.push("/editor");
            }}
          >
            Create Website
          </button>
        </div>
      </div>

      <ul role="list" className="divide-y divide-gray-100">
        {buckets.length > 0 &&
          buckets.map((el) => (
            <li
              key={el.bucketName}
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
                    {el.bucketName}
                  </p>
                  <p className="text-sm font-semibold leading-6 text-gray-500">
                    URL:{" "}
                    <a
                      href={`gnfd://${el.bucketName}`}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      gnfd://{el.bucketName}
                    </a>
                  </p>
                  <p className="mt-1 truncate text-sm leading-5 text-gray-500">
                    Created at{" "}
                    {moment.unix(el.updatedAt).format("YYYY-MM-DDTHH:MMZ")}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex flex-row gap-6">
                <a
                  href="/dashboard/posts/"
                  className="text-blue-600 hover:text-blue-500"
                >
                  Manage
                </a>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
