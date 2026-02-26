import { Body, Controller, Post, Route } from 'tsoa';
import { ingest } from "../ingest";
//const fs = require('fs');

@Route('bulkdata')
export class BulkdataController extends Controller {
  @Post('/tplink')
  public async receiveJson(@Body() requestBody: any): Promise<void> {
    try {
      //fs.appendFileSync('requestBody.json', JSON.stringify(requestBody, null, 2) + '\n');
      await ingest(requestBody);
      this.setStatus(200);
    } catch (e: any) {
      console.error("ERROR: ${e}\nJSON: ${requestBody}");
      this.setStatus(500);
    }
  }
}
