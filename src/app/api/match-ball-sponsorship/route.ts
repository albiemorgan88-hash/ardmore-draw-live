import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";

const ALLOWED_ASSET_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const STORAGE_BUCKET = "match-ball-sponsorships";

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureBucket() {
  const supabase = createServiceClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error("Could not access sponsor asset storage");
  }

  const exists = buckets?.some((bucket) => bucket.name === STORAGE_BUCKET);

  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(
      STORAGE_BUCKET,
      {
        public: false,
        fileSizeLimit: `${MAX_ASSET_BYTES}`,
        allowedMimeTypes: [...ALLOWED_ASSET_TYPES],
      }
    );

    if (createError) {
      throw new Error("Could not prepare sponsor asset storage");
    }
  }

  return supabase;
}

function getReturnPage(req: NextRequest) {
  const fallback = `${req.nextUrl.origin}/draw`;
  const referer = req.headers.get("referer");

  if (!referer) {
    return fallback;
  }

  try {
    const refererUrl = new URL(referer);
    if (refererUrl.origin !== req.nextUrl.origin) {
      return fallback;
    }

    return `${refererUrl.origin}${refererUrl.pathname}`;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const assetEntry = formData.get("asset");
    const asset =
      assetEntry instanceof File && assetEntry.size > 0 ? assetEntry : null;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    let assetBucket = "";
    let assetPath = "";
    let assetName = "";

    if (asset) {
      if (!ALLOWED_ASSET_TYPES.has(asset.type)) {
        return NextResponse.json(
          { error: "Please upload a PNG, JPG, WEBP or SVG file" },
          { status: 400 }
        );
      }

      if (asset.size > MAX_ASSET_BYTES) {
        return NextResponse.json(
          { error: "Please keep the file size under 5MB" },
          { status: 400 }
        );
      }

      const supabase = await ensureBucket();
      const extension = asset.name.includes(".")
        ? `.${asset.name.split(".").pop()?.toLowerCase()}`
        : "";
      const safeName = sanitizeFileName(asset.name.replace(/\.[^.]+$/, ""));
      const fileStem = safeName || "sponsor-asset";
      const datePrefix = new Date().toISOString().slice(0, 10);

      assetBucket = STORAGE_BUCKET;
      assetPath = `${datePrefix}/${crypto.randomUUID()}-${fileStem}${extension}`;
      assetName = asset.name;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(assetPath, await asset.arrayBuffer(), {
          contentType: asset.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error("Could not upload the sponsor image");
      }
    }

    const returnPage = getReturnPage(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: 3000,
            product_data: {
              name: "Ardmore CC Match Ball Sponsorship",
              description: `Sponsored by ${name}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "match_ball_sponsorship",
        sponsor_name: name,
        sponsor_email: email,
        sponsor_message: message,
        asset_bucket: assetBucket,
        asset_path: assetPath,
        asset_name: assetName,
      },
      success_url: `${returnPage}?matchBallSponsor=success&session_id={CHECKOUT_SESSION_ID}#match-ball-sponsorship`,
      cancel_url: `${returnPage}#match-ball-sponsorship`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not start sponsorship checkout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
