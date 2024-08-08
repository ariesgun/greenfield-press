import { Demo } from "@/components/demo";
import { Wallet } from "@/components/wallet";
import { useIsMounted } from "@/hooks/useIsMounted";
import styles from "@/styles/Home.module.css";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

import dynamic from "next/dynamic";
import { Greenfield } from "@/components/greenfield";
let Editor = dynamic(() => import("@/components/editor"), {
  ssr: false,
});

const inter = Inter({ subsets: ["latin"] });

export default function Dashboard() {
  const isMounted = useIsMounted();
  const { isConnected } = useAccount();
  const [content, setContent] = useState("");
  const editorRef = useRef(null);

  if (!isMounted) return null;

  return (
    <>
      <Head>
        <title>Editor Greenfield App</title>
        <meta name="description" content="Generated by create Greenfield app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className={`${styles.main} ${inter.className}`}>
        <Wallet />
        {isConnected && (
          <>
            <Greenfield data={content}>
              <Editor
                data={content}
                onChange={(e) => {
                  console.log(e);
                  setContent(e);
                }}
                holder="editor_create"
                editorRef={editorRef}
              />
            </Greenfield>
          </>
        )}
      </main>
    </>
  );
}
