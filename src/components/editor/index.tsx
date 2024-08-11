import React, { useEffect, useRef, useState } from "react";
import EditorJS from "@editorjs/editorjs";
import CheckList from "@editorjs/checklist";
import Code from "@editorjs/code";
import Delimiter from "@editorjs/delimiter";
import Embed from "@editorjs/embed";
import Image from "@editorjs/image";
import InlineCode from "@editorjs/inline-code";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
import RawTool from "@editorjs/raw";
// import Table from "@editorjs/table";
import SimpleImage from "@editorjs/simple-image";
// import Paragraph from "@editorjs/paragraph";
import Header from "@editorjs/header";
import Raw from "@editorjs/raw";
import { read } from "fs";

const EDITOR_TOOLS: any = {
  code: Code,
  embed: Embed,
  header: Header,
  raw: RawTool,
  image: SimpleImage,
  checklist: {
    class: CheckList,
    inlineToolbar: true,
  },
  list: {
    class: List,
    inlineToolbar: true,
    config: {
      defaultStyle: "unordered",
    },
  },
  quote: {
    class: Quote,
    inlineToolbar: true,
    shortcut: "CMD+SHIFT+O",
    config: {
      quotePlaceholder: "Enter a quote",
      captionPlaceholder: "Quote's author",
    },
  },
};

export default function Editor({ data, onChange, holder, readOnly = false }) {
  //add a reference to editor
  const ref = useRef<any>();
  //initialize editorjs

  useEffect(() => {
    //initialize editor if we don't have a reference
    if (!ref.current) {
      const editor = new EditorJS({
        holder: holder,
        placeholder: "Start writting here..",
        tools: EDITOR_TOOLS,
        data,
        readOnly: readOnly,
        async onChange(api, event) {
          const content = await api.saver.save();
          // console.log(content, "sdfb");
          onChange(content);
        },
      });
      ref.current = editor;
    }

    //add a return function handle cleanup
    return () => {
      if (ref.current && ref.current.destroy) {
        ref.current.destroy();
      }
    };
  }, []);

  return (
    <>
      <div
        className="w-full min-h-[500px] bg-slate-50 py-9 rounded-2xl text-black"
        id={holder}
      />
    </>
  );
}

// export default function WrappedEditor({ editorRef, ...props }) {
//   return <Editor {...props} ref={editorRef} />;
// }
