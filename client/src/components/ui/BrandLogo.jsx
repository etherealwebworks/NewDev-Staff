import { useEffect, useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import Logo from "./Logo";

/** Company logo from Settings when one is set (and loads); otherwise the built-in NEWDEV mark. */
export default function BrandLogo({ forceTheme, className = "" }) {
  const { data } = useSettings();
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [data?.logo_url]);

  if (data?.logo_url && !broken) {
    return <img src={data.logo_url} alt={data.company_name || "Company logo"} onError={() => setBroken(true)} className={`${className} rounded-md bg-white object-contain p-1`} />;
  }
  return <Logo forceTheme={forceTheme} className={className} />;
}
