import type {
  ImagesPdfCommand,
  ImagesPdfWorkerMessage,
} from "@/types/images-to-pdf";
import { imagesToPdf } from "./images-to-pdf";
import { toPdfError } from "./errors";

console.warn = () => undefined;
const send = (message: ImagesPdfWorkerMessage, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });

self.onmessage = async ({
  data,
}: MessageEvent<{ requestId: number; command: ImagesPdfCommand }>) => {
  const { requestId, command } = data;
  try {
    const result = await imagesToPdf(
      command.images,
      command.settings,
      (completed, total) =>
        send({ requestId, type: "progress", completed, total }),
    );
    send({ requestId, type: "success", result }, [result.bytes]);
  } catch (error) {
    const safe = toPdfError(error, "images");
    send({ requestId, type: "error", code: safe.code, message: safe.message });
  }
};
