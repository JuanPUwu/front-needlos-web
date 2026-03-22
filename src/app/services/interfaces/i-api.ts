// Equivalente a Services/Interfaces/ en el desktop
// Contrato del servicio HTTP base

export interface IApi {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, body: unknown): Promise<T>;
  put<T>(endpoint: string, body: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}
