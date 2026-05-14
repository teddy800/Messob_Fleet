// Shared avatar component — shows user photo from Odoo or initials fallback
import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { searchRead } from "@/lib/odooApi";

export default function UserAvatar({ size = 8, textSize = "text-sm" }) {
  const user = useUserStore((s) => s.user);
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    searchRead("res.users", [["id", "=", user.uid]], ["id", "image_128"], 1)
      .then((data) => {
        if (data[0]?.image_128) setAvatar(`data:image/png;base64,${data[0].image_128}`);
      })
      .catch(() => {});
  }, [user?.uid]);

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  const sizeClass = `h-${size} w-${size}`;

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden shrink-0`}>
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setAvatar(null)}
        />
      ) : (
        <div className="h-full w-full bg-brand-gold flex items-center justify-center">
          <span className={`${textSize} font-black text-brand-blue`}>{initial}</span>
        </div>
      )}
    </div>
  );
}
