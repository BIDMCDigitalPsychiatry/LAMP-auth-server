import crypto from "crypto"
/**
 * If the data could not be encrypted or is invalid, returns `undefined`.
 */
export const Encrypt = (data: string, mode = "Rijndael") => {
    try {
      if (mode === "Rijndael") {
        const cipher = crypto.createCipheriv("aes-256-ecb", process.env.DB_KEY || "", "")
        return cipher.update(data, "utf8", "base64") + cipher.final("base64")
      } else if (mode === "AES256") {
        const ivl = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(process.env.ROOT_KEY || "", "hex"), ivl)
        return Buffer.concat([ivl, cipher.update(Buffer.from(data, "utf16le")), cipher.final()]).toString("base64")
      }
    } catch {}
    return undefined
  }
  
/**
 * If the data could not be decrypted or is invalid, returns `undefined`.
 */
export const Decrypt = (data: string, mode = "Rijndael") => {
try {
    if (mode === "Rijndael") {
    const cipher = crypto.createDecipheriv("aes-256-ecb", process.env.DB_KEY || "", "")
    return cipher.update(data, "base64", "utf8") + cipher.final("utf8")
    } else if (mode === "AES256") {
    const dat = Buffer.from(data, "base64")
    const cipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(process.env.ROOT_KEY || "", "hex"),
        dat.slice(0, 16)
    )
    return Buffer.concat([cipher.update(dat.slice(16)), cipher.final()]).toString("utf16le")
    }
} catch {}
return undefined
}
