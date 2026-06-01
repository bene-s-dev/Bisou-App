import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Web Push requires signing with VAPID keys.
// We use the web-push compatible approach via the Web Crypto API.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Handle GET request to retrieve public VAPID key
  if (req.method === 'GET') {
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
    if (!VAPID_PUBLIC_KEY) {
      return new Response(
        JSON.stringify({ error: 'VAPID public key not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    return new Response(
      JSON.stringify({ vapidPublicKey: VAPID_PUBLIC_KEY }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@beneclara.de'

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured in Supabase secrets')
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body = await req.json()
    const { user_id, partner_id, type } = body

    if (!user_id || !partner_id) {
      return new Response(
        JSON.stringify({ error: 'user_id and partner_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Get the sender's display name
    const { data: senderProfile } = await db
      .from('profiles')
      .select('display_name')
      .eq('id', user_id)
      .single()

    const senderName = senderProfile?.display_name || 'Dein Partner'

    // 2. Get the partner's push subscription
    const { data: subData, error: subError } = await db
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', partner_id)
      .maybeSingle()

    if (subError || !subData) {
      return new Response(
        JSON.stringify({ message: 'Partner has no push subscription', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const subscription = subData.subscription

    // 3. Build the notification payload
    let title = 'Bisou 💌'
    let notifBody = `${senderName} hat die täglichen Fragen beantwortet!`
    let url = '/questions'

    if (type === 'partner_linked') {
      title = 'Bisou 💕'
      notifBody = `${senderName} hat sich mit dir verbunden!`
      url = '/dashboard'
    } else if (type === 'partner_unlinked') {
      title = 'Bisou'
      notifBody = `${senderName} hat die Verbindung getrennt.`
      url = '/profile'
    } else if (type === 'nudge') {
      title = 'Bisou ❤️'
      notifBody = `${senderName} hat dich abgestupst!`
      url = '/dashboard'
    }

    const payload = JSON.stringify({
      title,
      body: notifBody,
      url,
    })

    // 4. Send the push notification using the Web Push protocol
    const pushResult = await sendWebPush(
      subscription,
      payload,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
      VAPID_SUBJECT
    )

    if (!pushResult.ok) {
      // If subscription is expired (410 Gone), clean it up
      if (pushResult.status === 410 || pushResult.status === 404) {
        await db
          .from('push_subscriptions')
          .delete()
          .eq('user_id', partner_id)

        return new Response(
          JSON.stringify({ message: 'Subscription expired, cleaned up', status: pushResult.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const errorText = await pushResult.text()
      console.error('Push send failed:', pushResult.status, errorText)
      throw new Error(`Push failed with status ${pushResult.status}: ${errorText}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================
// Web Push implementation using Web Crypto API (no npm needed)
// ============================================================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function uint8ArrayToUrlBase64(uint8Array: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function generateVapidAuthHeader(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  // JWT Header
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const jwtPayload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  }

  const encodedHeader = uint8ArrayToUrlBase64(new TextEncoder().encode(JSON.stringify(header)))
  const encodedPayload = uint8ArrayToUrlBase64(new TextEncoder().encode(JSON.stringify(jwtPayload)))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  // Import the private key
  const privateKeyBytes = urlBase64ToUint8Array(privateKey)

  // The private key for ECDSA P-256 is 32 bytes
  const keyData = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: uint8ArrayToUrlBase64(urlBase64ToUint8Array(publicKey).slice(1, 33)),
      y: uint8ArrayToUrlBase64(urlBase64ToUint8Array(publicKey).slice(33, 65)),
      d: uint8ArrayToUrlBase64(privateKeyBytes),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    keyData,
    new TextEncoder().encode(unsignedToken)
  )

  // Convert DER signature to raw r||s format if needed
  const sigBytes = new Uint8Array(signature)
  let rawSig: Uint8Array
  if (sigBytes.length === 64) {
    rawSig = sigBytes
  } else {
    // DER encoded – parse it
    rawSig = derToRaw(sigBytes)
  }

  const encodedSignature = uint8ArrayToUrlBase64(rawSig)
  const token = `${unsignedToken}.${encodedSignature}`

  return {
    authorization: `vapid t=${token}, k=${publicKey}`,
    cryptoKey: `p256ecdsa=${publicKey}`,
  }
}

function derToRaw(der: Uint8Array): Uint8Array {
  // DER format: 0x30 [total-len] 0x02 [r-len] [r] 0x02 [s-len] [s]
  const raw = new Uint8Array(64)
  let offset = 2 // skip 0x30 and total length

  // R value
  const rLen = der[offset + 1]
  const rStart = offset + 2
  const rBytes = der.slice(rStart, rStart + rLen)
  // Pad or trim to 32 bytes
  if (rBytes.length <= 32) {
    raw.set(rBytes, 32 - rBytes.length)
  } else {
    raw.set(rBytes.slice(rBytes.length - 32), 0)
  }

  offset = rStart + rLen

  // S value
  const sLen = der[offset + 1]
  const sStart = offset + 2
  const sBytes = der.slice(sStart, sStart + sLen)
  if (sBytes.length <= 32) {
    raw.set(sBytes, 64 - sBytes.length)
  } else {
    raw.set(sBytes.slice(sBytes.length - 32), 32)
  }

  return raw
}

async function sendWebPush(
  subscription: any,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  const endpoint = subscription.endpoint
  const audience = new URL(endpoint).origin

  const vapidHeaders = await generateVapidAuthHeader(
    audience,
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  )

  // For unencrypted push (which works for most modern browsers with the
  // subscription's built-in encryption), we send the payload directly.
  // However, the Web Push protocol requires encryption using the subscription keys.
  
  // Get the client's public key and auth secret from the subscription
  const clientPublicKey = subscription.keys?.p256dh
  const clientAuthSecret = subscription.keys?.auth

  if (!clientPublicKey || !clientAuthSecret) {
    throw new Error('Subscription is missing encryption keys')
  }

  // Encrypt the payload using the Web Push encryption scheme (aes128gcm)
  const encrypted = await encryptPayload(
    payload,
    clientPublicKey,
    clientAuthSecret
  )

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeaders.authorization,
      'TTL': '86400',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Urgency': 'normal',
    },
    body: encrypted,
  })
}

async function encryptPayload(
  payload: string,
  clientPublicKeyBase64: string,
  clientAuthSecretBase64: string
): Promise<Uint8Array> {
  const clientPublicKeyBytes = urlBase64ToUint8Array(clientPublicKeyBase64)
  const clientAuthSecret = urlBase64ToUint8Array(clientAuthSecretBase64)

  // Generate an ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  // Export the local public key in uncompressed form
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  )

  // Import the client's public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret via ECDH
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      localKeyPair.privateKey,
      256
    )
  )

  // HKDF to derive the encryption key and nonce
  // IKM for the PRK: the ECDH shared secret
  // Salt: the auth secret
  const prkInfoPrefix = new TextEncoder().encode('WebPush: info\0')
  const prkInfo = new Uint8Array(prkInfoPrefix.length + clientPublicKeyBytes.length + localPublicKeyRaw.length)
  prkInfo.set(prkInfoPrefix)
  prkInfo.set(clientPublicKeyBytes, prkInfoPrefix.length)
  prkInfo.set(localPublicKeyRaw, prkInfoPrefix.length + clientPublicKeyBytes.length)

  const prkKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits'])
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: clientAuthSecret, info: prkInfo },
      prkKey,
      256
    )
  )

  // Generate a 16-byte salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Derive the content encryption key (CEK) and nonce
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0')
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0')

  const ikmKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits'])

  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
      ikmKey,
      128
    )
  )

  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
      ikmKey,
      96
    )
  )

  // Encrypt the payload
  const payloadBytes = new TextEncoder().encode(payload)
  // Add padding delimiter (0x02 for the last record)
  const paddedPayload = new Uint8Array(payloadBytes.length + 1)
  paddedPayload.set(payloadBytes)
  paddedPayload[payloadBytes.length] = 2 // delimiter byte

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      paddedPayload
    )
  )

  // Build the aes128gcm header:
  // salt (16 bytes) + record size (4 bytes, big-endian) + key ID length (1 byte) + key ID (local public key, 65 bytes)
  const recordSize = encrypted.length + 86 // header size (16 + 4 + 1 + 65 = 86) for the record
  const header = new Uint8Array(86)
  header.set(salt, 0) // 16 bytes salt
  // Record size as 4-byte big-endian uint32
  const rs = payloadBytes.length + 1 + 16 + 86 // content + padding + tag + header
  header[16] = (rs >>> 24) & 0xff
  header[17] = (rs >>> 16) & 0xff
  header[18] = (rs >>> 8) & 0xff
  header[19] = rs & 0xff
  header[20] = 65 // key ID length (uncompressed P-256 key)
  header.set(localPublicKeyRaw, 21) // 65 bytes

  // Combine header + encrypted content
  const result = new Uint8Array(header.length + encrypted.length)
  result.set(header)
  result.set(encrypted, header.length)

  return result
}
