import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { resolveMediaUrl } from "../lib/media";
import { NGROK_SKIP_WARNING_HEADER } from "../api/client";
import { API_BASE_URL } from "../config/env";

type RemoteImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
};

// Uploaded media is served straight off the API host, which in dev is often an ngrok free-tier
// tunnel — its browser-warning interstitial carries no CORS headers and can only be bypassed
// with a request header, which a plain <img src> can never send (unlike axios/fetch calls, see
// api/client.ts's NGROK_SKIP_WARNING_HEADER). Routing these through fetch with that same header
// and swapping in a blob URL sidesteps it. Anything not hosted on the API itself (data:, blob:,
// a CDN) doesn't need this and is rendered as a plain <img>.
export function RemoteImage({ src, ...rest }: RemoteImageProps) {
  const resolved = resolveMediaUrl(src);
  const needsFetch = !!resolved && !!API_BASE_URL && resolved.startsWith(API_BASE_URL);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!needsFetch) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    fetch(resolved, { headers: NGROK_SKIP_WARNING_HEADER })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolved, needsFetch]);

  return <img src={needsFetch ? (blobUrl ?? undefined) : resolved || undefined} {...rest} />;
}
