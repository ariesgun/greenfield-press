import { ConnectButton } from "@rainbow-me/rainbowkit";

export const Wallet = () => {
  return (
    <div className="mx-auto">
      <ConnectButton accountStatus="address" />
    </div>
  );
};
