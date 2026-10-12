import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";

/**
 * Sends a file for an Item photo (the photo or its thumbnail) to storage
 * through a one-time upload address, and registers it to the person at once,
 * so nothing else can use it before `photos.attach` does. `type` is the
 * format to store it as, the file's own unless given.
 */
export function useStorePhotoFile() {
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const register = useMutation(api.photos.register);
  return async (file: Blob, type = file.type) => {
    const response = await fetch(await generateUploadUrl(), {
      method: "POST",
      headers: { "Content-Type": type },
      body: file,
    });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    await register({ storageId });
    return storageId;
  };
}
