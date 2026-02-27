import { Body, Controller, Post, Route, SuccessResponse, Response } from 'tsoa';
import { ingestionQueue } from "../queue";

@Route('bulkdata')
export class BulkdataController extends Controller {
  @SuccessResponse("202", "Accepted for processing")
  @Response("500", "Internal Server Error")
  @Post('/tplink')
  public async receiveJson(@Body() requestBody: any): Promise<void> {
    try {
      await ingestionQueue.add('process-tplink', requestBody, {
        attempts: 3,
        backoff: 1000,
      });
      this.setStatus(202);
    } catch (e: any) {
      console.error("Erro ao enfileirar dados:", e.message);
      this.setStatus(500);
    }
  }
}
