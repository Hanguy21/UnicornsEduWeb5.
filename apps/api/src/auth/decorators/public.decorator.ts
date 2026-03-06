import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants';

/**
 * Marks a route as public (no JWT required).
 * Use on login, register, refresh, and other unauthenticated endpoints.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
