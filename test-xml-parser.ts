import { parseXmlInvoice } from './lib/invoice-parser';

const sampleXml = `
<HDon>
  <DLHDon>
    <TTChung>
      <SHDon>0000123</SHDon>
      <NLap>2023-11-20T10:00:00</NLap>
    </TTChung>
    <NDBan>
      <TEN>CÔNG TY CP TRỊNH GIA</TEN>
      <MST>0312668899</MST>
    </NDBan>
    <HHDVu>
      <HHDVu>
        <THHDVu>Máy in phun màu G2010</THHDVu>
        <SLuong>2</SLuong>
        <DGia>2500000</DGia>
        <THTIEN>5000000</THTIEN>
        <TSUAT>10</TSUAT>
      </HHDVu>
      <HHDVu>
        <THHDVu>Mực in Black 100ml</THHDVu>
        <SLuong>5</SLuong>
        <DGia>150000</DGia>
        <THTIEN>750000</THTIEN>
        <TSUAT>10</TSUAT>
      </HHDVu>
    </HHDVu>
    <TToan>
      <TGTTTBSO>5750000</TGTTTBSO>
      <TGTTHUE>575000</TGTTHUE>
    </TToan>
  </DLHDon>
</HDon>
`;

const res = parseXmlInvoice(sampleXml);
console.log(JSON.stringify(res, null, 2));
