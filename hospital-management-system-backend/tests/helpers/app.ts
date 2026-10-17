import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

/** Supertest agent bound to the real Express app (all middleware included). */
export const api = () => request(app);
export const API = '/api/v1';
