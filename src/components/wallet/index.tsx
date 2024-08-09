import { ConnectButton } from "@rainbow-me/rainbowkit";

export const Wallet = () => {
  return (
    <div className="mx-auto pb-8">
      <ConnectButton accountStatus="address" />
    </div>
  );
};
