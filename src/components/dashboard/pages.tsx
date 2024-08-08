import { client, selectSp } from "@/client";
import { getOffchainAuthKeys } from "@/utils/offchainAuth";
import moment from "moment";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

export function Dashboard() {
  const { address, connector } = useAccount();
  const [info, setInfo] = useState<{
    bucketName: string;
    objectName: string;
  }>({
    bucketName: "helllo-world-test-xeo",
    objectName: "",
  });

  const [posts, setPosts] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!address) return;

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
          bucketName: info.bucketName,
          endpoint: spInfo.endpoint,
        });

        if (listObjectsTx.code === 0) {
          console.log(listObjectsTx.body);

          const objects =
            listObjectsTx!.body.GfSpListObjectsByBucketNameResponse.Objects;

          objects.forEach((el) => {
            setPosts((posts) => [
              ...posts,
              {
                bucketName: el.ObjectInfo.BucketName,
                objectName: el.ObjectInfo.ObjectName,
                owner: el.ObjectInfo.Owner,
                creator: el.ObjectInfo.Creator,
                createdAt: el.ObjectInfo.CreateAt,
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

    setPosts([]);
    listPosts();
  }, [address]);

  return (
    <div>
      <div className="pt-10 pb-2 sm:px-0 flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-3xl font-semibold leading-7 text-gray-900">
            Dashboard
          </h3>
          <p className="mt-2 max-w-2xl text-base leading-6 text-gray-500">
            Manage your posts
          </p>
        </div>
        <div className="mb-4 flex items-center justify-end">
          <button
            className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              router.push("/editor");
            }}
          >
            Create Post
          </button>
        </div>
      </div>

      <div className="mb-2">
        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <div className="text-base font-medium leading-6 text-gray-900">
            Website (Bucket)
          </div>
          <div className="mt-1 text-base leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
            {info.bucketName}
          </div>
        </div>
      </div>

      <ul role="list" className="divide-y divide-gray-100">
        {posts.length > 0 &&
          posts.map((el) => (
            <li
              key={el.objectName}
              className="flex justify-between gap-x-6 py-5 items-center"
            >
              <div className="flex min-w-0 gap-x-4">
                <image
                  className="h-12 w-12 flex-none rounded-full bg-gray-50"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt=""
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
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  View
                </a>
                <a href="#" className="text-green-600 hover:text-green-500">
                  Edit
                </a>
                <a href="#" className="text-red-600 hover:text-red-500">
                  Delete
                </a>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
