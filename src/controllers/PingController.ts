import { Body, Controller, Post, Route, SuccessResponse, Response } from 'tsoa';
import { pingQueue } from "../queue";

@Route('ping')
export class PingController extends Controller {
  @SuccessResponse("202", "Accepted for processing")
  @Response("500", "Internal Server Error")
  @Post('/')
  public async receivePing(@Body() requestBody: any): Promise<void> {
    try {
      await pingQueue.add('process-ping', requestBody, {
        attempts: 3,
        backoff: 1000,
      });
      this.setStatus(202);
    } catch (e: any) {
      console.error("Erro ao enfileirar ping:", e.message);
      this.setStatus(500);
    }
  }
}
