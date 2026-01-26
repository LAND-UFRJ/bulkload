import { Body, Controller, Post, Route, SuccessResponse } from 'tsoa';
import { ingestPing } from "../pingIngest";

@Route('ping')
export class PingController extends Controller {
  @SuccessResponse("200", "Pings processados com sucesso")
  @Post('/')
  public async receivePing(@Body() requestBody: any): Promise<void> {
    try {
      await ingestPing(requestBody);
      this.setStatus(200);
    } catch (e: any) {
      console.error("Erro ao processar ping:", e.message);
      this.setStatus(500);
    }
  }
}
