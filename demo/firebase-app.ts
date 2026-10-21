// Substituto do Firebase usado só no modo de demonstração (npm run demo). Não vai para o site publicado.
export function initializeApp() {
  return {}
}
export class FirebaseError extends Error {
  code: string
  constructor(code: string, message = code) {
    super(message)
    this.code = code
  }
}
