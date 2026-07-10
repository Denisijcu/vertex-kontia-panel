import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environment/environment';

/** Adjunta X-Tenant-ID a toda llamada al API de Kontia.
 *  Cuando entre auth JWT, este interceptor muere y el tenant va en el token. */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(environment.apiUrl)) {
    req = req.clone({ setHeaders: { 'X-Tenant-ID': environment.tenantId } });
  }
  return next(req);
};