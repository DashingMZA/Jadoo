/**
 * Donation destinations. Sab **placeholder** values hain — real addresses
 * aur links daalne se pehle inhe badal dein, warna Donate page mein
 * "Not set up yet" dikhega aur copy/open buttons disabled rahenge (dekhein
 * `isConfigured()` neeche).
 *
 * ZAROORI: yahan koi bhi real crypto address daalne se pehle DOUBLE CHECK
 * karein ke wo aapka apna wallet address hai — ek ghalat address ka matlab
 * hai donations hamesha ke liye kho jayengi.
 */

export interface CryptoOption {
  coin: string;
  /** Network label, jaisa "TRC-20" ya "BEP-20 / BNB Chain". Optional. */
  network?: string;
  address: string;
}

export const CRYPTO_OPTIONS: CryptoOption[] = [
  {
    coin: "USDT",
    network: "TRX Tron (TRC-20)",
    address: "TSuxRZsBCSpRwVAgNoUih1r4zqaBFT6AVN",
  },
  {
    coin: "USDT",
    network: "BNB Smart Chain (BEP-20)",
    address: "0xbd0550b2e55b8873945d7e2efd8213eee7807705",
  },
  {
    coin: "USDT",
    network: "TON - The Open Network",
    address: "UQBQGZuYHj1fDYVHu85dF8EobdvbfLHauQ1Vmu3YSGaWLV36",
  },
  {
    coin: "USDT",
    network: "SOL - Solana",
    address: "5kXZX68o1331o9DnNf5TMBBZ3i89gv7nLqH4u6mMZU73",
  },
  {
    coin: "USDT",
    network: "APT - Aptos",
    address:
      "0x9ecd779235ec3d7c1b3e99c37deda42a99c03a24a791ed30de2373e5b4c1f944",
  },
  {
    coin: "USDT",
    network: "DOT - Polkadot",
    address: "158Dp11Ya2eZbWi21AauuTcyZSwbfR1KnWar6AFJBdnfTM8E",
  },
  {
    coin: "USDT",
    network: "XTZ - Tezos",
    address: "tz2KG1zrupwDnHZwx9cx962yVsfBDvHfS8te",
  },
];

export interface LinkOption {
  id: string;
  label: string;
  url: string;
}

export const LINK_OPTIONS: LinkOption[] = [
  { id: "gumroad", label: "Gumroad", url: "https://zuhan5.gumroad.com/" },
  {
    id: "buymeacoffee",
    label: "Buy Me a Coffee",
    url: "https://buymeacoffee.com/dashingmza",
  },
  { id: "paypal", label: "PayPal.me", url: "https://paypal.me/dashingmza" },
];

/** Placeholder abhi tak badla nahi gaya? */
export function isConfigured(value: string): boolean {
  return !value.includes("REPLACE_WITH");
}
