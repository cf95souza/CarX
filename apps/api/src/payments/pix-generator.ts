/**
 * Gerador de Payload Pix EMV (BR Code) Padrão Banco Central do Brasil
 */
import QRCode from 'qrcode';

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Cálculo do Checksum CRC16 CCITT (Polinômio 0x1021, inicial 0xFFFF)
 */
function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface GeneratePixOptions {
  pixKey: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  merchantName: string;
  merchantCity: string;
  amountCents?: number;
  txid?: string;
  description?: string;
}

export async function generatePixPayload(options: GeneratePixOptions): Promise<{
  pixCode: string;
  qrCodeUrl: string;
  qrCodeBase64: string;
}> {
  const {
    pixKey,
    merchantName = 'CARX OFICINA',
    merchantCity = 'SAO PAULO',
    amountCents = 0,
    txid = '***',
  } = options;

  // Sanitização
  const cleanName = merchantName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25).toUpperCase();
  const cleanCity = merchantCity.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15).toUpperCase();
  const cleanTxid = (txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  // Montagem dos Blocos EMV
  let payload = '';

  // 00: Payload Format Indicator
  payload += formatField('00', '01');

  // 01: Point of Initiation Method (12 = dinâmico / valor pré-definido)
  payload += formatField('01', amountCents > 0 ? '12' : '11');

  // 26: Merchant Account Information (Pix)
  let mai = '';
  mai += formatField('00', 'br.gov.bcb.pix');
  mai += formatField('01', pixKey);
  if (options.description) {
    mai += formatField('02', options.description.slice(0, 40));
  }
  payload += formatField('26', mai);

  // 52: Merchant Category Code (0000 = Geral)
  payload += formatField('52', '0000');

  // 53: Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // 54: Transaction Amount
  if (amountCents > 0) {
    const amountStr = (amountCents / 100).toFixed(2);
    payload += formatField('54', amountStr);
  }

  // 58: Country Code (BR)
  payload += formatField('58', 'BR');

  // 59: Merchant Name
  payload += formatField('59', cleanName);

  // 60: Merchant City
  payload += formatField('60', cleanCity);

  // 62: Additional Data Field (TxID)
  const additional = formatField('05', cleanTxid);
  payload += formatField('62', additional);

  // 63: CRC16
  const payloadWithCrcTag = payload + '6304';
  const crc = calculateCrc16(payloadWithCrcTag);
  const pixCode = payloadWithCrcTag + crc;

  // QR Code URL pública (compatível com visualização rápida)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

  // QR Code Base64 nativo (para renderização offline instantânea)
  let qrCodeBase64 = '';
  try {
    qrCodeBase64 = await QRCode.toDataURL(pixCode, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    });
  } catch (err) {
    qrCodeBase64 = qrCodeUrl;
  }

  return {
    pixCode,
    qrCodeUrl,
    qrCodeBase64,
  };
}

