// Mock av 'resend' for e-post-verntesten. Hver send teller via globalThis.__resendSend.
export class Resend {
  constructor() {
    this.emails = {
      send: async (o) => (globalThis.__resendSend ? globalThis.__resendSend(o) : { data: { id: 're' }, error: null }),
    }
  }
}
export default { Resend }
