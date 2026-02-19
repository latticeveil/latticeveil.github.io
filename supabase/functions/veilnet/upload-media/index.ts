// Edge function for secure ImageKit uploads
// File: supabase/functions/veilnet/upload-media/index.ts

interface MediaConfig {
  maxWidth: number;
  maxHeight?: number;
  crop?: boolean;
  format: string;
  maxSizeKB: number;
  folder: string;
}

interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileId?: string;
  mediaId?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

// Simple ImageKit client (without external dependencies)
class ImageKitClient {
  private url: string;
  private publicKey: string;
  private privateKey: string;

  constructor(config: { url: string; publicKey: string; privateKey: string }) {
    this.url = config.url;
    this.publicKey = config.publicKey;
    this.privateKey = config.privateKey;
  }

  async upload(fileData: {
    file: Uint8Array;
    fileName: string;
    folder: string;
    useUniqueFileName: boolean;
    tags?: string[];
  }) {
    // TODO: Implement ImageKit API call
    // For now, return mock data
    return {
      url: `https://ik.imagekit.io/mock_${fileData.fileName}`,
      fileId: `mock_${Date.now()}`,
      width: 512,
      height: 512,
      name: fileData.fileName
    };
  }
}

const imagekit = new ImageKitClient({
  url: (globalThis as any).Deno?.env.get("IMAGEKIT_URL") || "",
  publicKey: (globalThis as any).Deno?.env.get("IMAGEKIT_PUBLIC_KEY") || "",
  privateKey: (globalThis as any).Deno?.env.get("IMAGEKIT_PRIVATE_KEY") || "",
})

// Media type configurations
const mediaConfig = {
  avatar: {
    maxWidth: 512,
    maxHeight: 512,
    crop: true,
    format: "webp",
    maxSizeKB: 300,
    folder: "avatars"
  },
  banner: {
    maxWidth: 1600,
    maxHeight: 400,
    format: "webp",
    maxSizeKB: 600,
    folder: "banners"
  },
  chat: {
    maxWidth: 1280,
    format: "webp",
    maxSizeKB: 600,
    folder: "chat"
  },
  post: {
    maxWidth: 1920,
    format: "webp",
    maxSizeKB: 800,
    folder: "posts"
  }
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders })
    }

    // Verify user token
    const userResponse = await fetch(`${(globalThis as any).Deno?.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: { authorization: authHeader }
    })
    const { data: user } = await userResponse.json()
    if (!user?.id) {
      return new Response("Invalid token", { status: 401, headers: corsHeaders })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const mediaType = formData.get("mediaType") as string
    
    if (!file || !mediaType) {
      return new Response("Missing file or mediaType", { status: 400, headers: corsHeaders })
    }

    const config = mediaConfig[mediaType as keyof typeof mediaConfig]
    if (!config) {
      return new Response("Invalid mediaType", { status: 400, headers: corsHeaders })
    }

    // Validate file size
    const fileSizeKB = file.size / 1024
    if (fileSizeKB > config.maxSizeKB) {
      return new Response(`File too large. Max ${config.maxSizeKB}KB`, { status: 400, headers: corsHeaders })
    }

    // Process image
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    const uploadResult = await imagekit.upload({
      file: uint8Array,
      fileName: `${user.id}_${Date.now()}.webp`,
      folder: `${config.folder}/${user.id}`,
      useUniqueFileName: false,
      tags: [`owner:${user.id}`, `type:${mediaType}`],
    })

    if (!uploadResult.url || !uploadResult.fileId) {
      return new Response("Upload failed", { status: 500, headers: corsHeaders })
    }

    // Calculate expiry based on media type
    let expiresAt: Date | null = null
    let hardDeleteAt: Date | null = null
    
    if (mediaType === 'chat') {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      hardDeleteAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 days
    } else if (mediaType === 'post') {
      expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 days
      hardDeleteAt = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000) // 2 years
    }
    // avatar and banner are permanent

    // Store metadata in database
    const mediaResponse = await fetch(`${(globalThis as any).Deno?.env.get("SUPABASE_URL")}/rest/v1/media`, {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
        "apikey": (globalThis as any).Deno?.env.get("SUPABASE_ANON_KEY")
      },
      body: JSON.stringify({
        file_id: uploadResult.fileId,
        owner_id: user.id,
        media_type: mediaType,
        file_url: uploadResult.url,
        file_name: uploadResult.name,
        file_size: file.size,
        width: uploadResult.width,
        height: uploadResult.height,
        mime_type: file.type,
        expires_at: expiresAt?.toISOString(),
        hard_delete_at: hardDeleteAt?.toISOString()
      })
    })

    const mediaRecord = await mediaResponse.json()

    return new Response(JSON.stringify({
      success: true,
      fileUrl: uploadResult.url,
      fileId: uploadResult.fileId,
      mediaId: mediaRecord?.id
    }), {
      headers: corsHeaders
    })

  } catch (error) {
    console.error("Upload error:", error)
    return new Response("Internal server error", { status: 500, headers: corsHeaders })
  }
}

// Add the serve call at the end
(globalThis as any).addEventListener('fetch', (event: any) => {
  event.respondWith(handleRequest(event.request))
})
