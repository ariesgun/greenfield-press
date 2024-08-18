import Web3 from "web3";

function toHex(d) {
  return Number(d).toString(16);
}

export const encodeDNSRecord = (
  bnbName: string,
  bucketName: string,
  web3: Web3
) => {
  let output = "0x";

  const record = bnbName;
  const recordHex = Buffer.from(record, "utf-8").toString("hex");

  // output += toHex(recordHex.length / 2);
  output += web3.utils.padLeft(toHex(recordHex.length / 2), 2);
  output += recordHex;
  output += "00";

  // Type
  // output += "0001"; // A
  output += "0010"; // TXT

  // CLASS
  output += "0001";

  // TTL
  output += "0000184c";

  // RDLength + RD
  const payload = `dnslink=https://gnfd-testnet-sp2.nodereal.io/view/gnfd-press-${bucketName}/`;
  const payloadHex = Buffer.from(payload, "utf-8").toString("hex");
  output += web3.utils.padLeft(toHex(payloadHex.length / 2), 4);
  output += payloadHex;

  // console.log("TXT", web3.utils.padLeft(toHex(payloadHex.length / 2), 4));
  // console.log("TXT", payloadHex);
  // console.log(",.,,", web3.utils.keccak256("0x0d78656e6f736765636b2e626e6200"));

  // console.log(output);

  return output;
};
