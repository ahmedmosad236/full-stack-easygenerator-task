import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { AUTH_COOKIE_NAME } from '../src/auth/auth.constants';
import { User, UserDocument } from '../src/users/schemas/user.schema';

describe('Authentication & Protected Application API (Integration / E2E)', () => {
  let app: INestApplication;
  let userModel: Model<UserDocument>;

  const allowedOrigin = 'http://localhost:5173';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI_TEST =
      process.env.MONGODB_URI_TEST ||
      'mongodb://127.0.0.1:27017/auth_test_integration';
    process.env.MONGODB_URI = process.env.MONGODB_URI_TEST;
    process.env.JWT_SECRET =
      'integration_test_jwt_secret_key_at_least_32_characters';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.WEB_ORIGIN = allowedOrigin;
    process.env.THROTTLE_TTL = '60000';
    process.env.THROTTLE_LIMIT = '100';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    userModel = moduleFixture.get<Model<UserDocument>>(
      getModelToken(User.name),
    );
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    if (userModel) {
      await userModel.deleteMany({});
    }
    if (app) {
      await app.close();
    }
  });

  function extractAuthCookie(res: request.Response): string | undefined {
    const rawCookies = res.headers['set-cookie'];
    if (!rawCookies) {
      return undefined;
    }
    const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
    return cookies.find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));
  }

  describe('1. Successful signup & password hashing', () => {
    it('registers a new user, normalizes email, hashes password with Argon2id, sets HttpOnly cookie, and omits sensitive fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: '  Jane Doe  ',
          email: '  Jane.Doe@Example.COM  ',
          password: 'SecurePassword1!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
      });
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.createdAt).toBeDefined();

      // Verify sensitive data is never exposed in response body
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('token');
      expect(JSON.stringify(response.body)).not.toContain('SecurePassword1!');
      expect(JSON.stringify(response.body)).not.toContain('$argon2id$');

      // Verify HttpOnly cookie is set properly
      const authCookie = extractAuthCookie(response);
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie).toContain('Path=/');
      expect(authCookie).toContain('SameSite=Lax');

      // Verify password was hashed with Argon2id in MongoDB
      const dbUser = await userModel
        .findOne({ email: 'jane.doe@example.com' })
        .exec();
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe('SecurePassword1!');
      expect(dbUser?.passwordHash.startsWith('$argon2id$')).toBe(true);
    });
  });

  describe('2. Invalid email validation', () => {
    it('rejects signup with an invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'Jane Doe',
          email: 'not-a-valid-email',
          password: 'SecurePassword1!',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(JSON.stringify(response.body.message)).toContain(
        'Please enter a valid email address.',
      );
    });
  });

  describe('3. Invalid password validation', () => {
    it('rejects password shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Ab1!',
        })
        .expect(400);

      expect(JSON.stringify(response.body.message)).toContain(
        'Password must be at least 8 characters long.',
      );
    });

    it('rejects password without a letter', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: '12345678!',
        })
        .expect(400);

      expect(JSON.stringify(response.body.message)).toContain(
        'Password must contain at least one letter.',
      );
    });

    it('rejects password without a number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'PasswordOnly!',
        })
        .expect(400);

      expect(JSON.stringify(response.body.message)).toContain(
        'Password must contain at least one number.',
      );
    });

    it('rejects password without a special character', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Password123',
        })
        .expect(400);

      expect(JSON.stringify(response.body.message)).toContain(
        'Password must contain at least one special character.',
      );
    });
  });

  describe('4. Name shorter than 3 characters', () => {
    it('rejects signup when trimmed name is shorter than 3 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: '  Jo  ',
          email: 'jo@example.com',
          password: 'SecurePassword1!',
        })
        .expect(400);

      expect(JSON.stringify(response.body.message)).toContain(
        'Name must be at least 3 characters long.',
      );
    });

    it('rejects requests containing unexpected non-whitelisted fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'SecurePassword1!',
          role: 'admin',
        })
        .expect(400);

      expect(JSON.stringify(response.body.message)).toContain(
        'property role should not exist',
      );
    });
  });

  describe('5. Duplicate email registration', () => {
    it('rejects duplicate email registration (case-insensitive) with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'SecurePassword1!',
        })
        .expect(201);

      const duplicateResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'Jane Duplicate',
          email: 'JANE@EXAMPLE.COM',
          password: 'AnotherPassword1!',
        })
        .expect(409);

      expect(duplicateResponse.body.statusCode).toBe(409);
      expect(duplicateResponse.body.message).toBe(
        'An account with this email address already exists.',
      );
    });
  });

  describe('7 & 8. Signin & Incorrect credentials', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'John Smith',
          email: 'john.smith@example.com',
          password: 'CorrectPassword1!',
        })
        .expect(201);
    });

    it('signs in an existing user, sets HttpOnly cookie, and returns safe user profile', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .set('Origin', allowedOrigin)
        .send({
          email: '  JOHN.SMITH@example.com ',
          password: 'CorrectPassword1!',
        })
        .expect(200);

      expect(response.body.user).toMatchObject({
        name: 'John Smith',
        email: 'john.smith@example.com',
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('accessToken');

      const authCookie = extractAuthCookie(response);
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
    });

    it('rejects incorrect password without revealing whether email exists', async () => {
      const wrongPassResponse = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .set('Origin', allowedOrigin)
        .send({
          email: 'john.smith@example.com',
          password: 'WrongPassword1!',
        })
        .expect(401);

      const unknownEmailResponse = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .set('Origin', allowedOrigin)
        .send({
          email: 'nobody@example.com',
          password: 'WrongPassword1!',
        })
        .expect(401);

      expect(wrongPassResponse.body.message).toBe('Invalid email or password.');
      expect(unknownEmailResponse.body.message).toBe(
        'Invalid email or password.',
      );
    });
  });

  describe('9, 10, 11, 12. Protected endpoints, Logout, and Access after logout', () => {
    it('denies access to /api/auth/me and /api/application without authentication cookie', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);

      await request(app.getHttpServer()).get('/api/application').expect(401);
    });

    it('allows access to /api/auth/me and /api/application with valid cookie, and denies access after logout', async () => {
      const agent = request.agent(app.getHttpServer());

      // Sign up establishes session cookie on agent
      const signupRes = await agent
        .post('/api/auth/signup')
        .set('Origin', allowedOrigin)
        .send({
          name: 'Protected User',
          email: 'protected@example.com',
          password: 'SecurePassword1!',
        })
        .expect(201);

      expect(signupRes.body.user.email).toBe('protected@example.com');

      // Access /api/auth/me with valid authentication cookie
      const meRes = await agent.get('/api/auth/me').expect(200);
      expect(meRes.body.user).toMatchObject({
        name: 'Protected User',
        email: 'protected@example.com',
      });

      // Access /api/application with valid authentication cookie
      const appRes = await agent.get('/api/application').expect(200);
      expect(appRes.body).toEqual({
        message: 'Welcome to the application.',
      });

      // Logout clears the authentication cookie
      const logoutRes = await agent
        .post('/api/auth/logout')
        .set('Origin', allowedOrigin)
        .expect(200);

      expect(logoutRes.body).toEqual({
        message: 'Logged out successfully.',
      });

      const clearedCookie = extractAuthCookie(logoutRes);
      expect(clearedCookie).toBeDefined();
      expect(clearedCookie).toContain(`${AUTH_COOKIE_NAME}=;`);

      // Subsequent access to protected endpoints after logout is denied
      await agent.get('/api/auth/me').expect(401);
      await agent.get('/api/application').expect(401);
    });
  });

  describe('CSRF Origin Validation & Health Check', () => {
    it('blocks state-changing POST requests from an untrusted Origin with 403 Forbidden', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .set('Origin', 'https://malicious-site.example.com')
        .send({
          name: 'Victim User',
          email: 'victim@example.com',
          password: 'SecurePassword1!',
        })
        .expect(403);

      expect(response.body.statusCode).toBe(403);
      expect(response.body.message).toContain('untrusted Origin header');
    });

    it('returns health status on GET /api/health', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        database: 'connected',
      });
    });

    it('exposes Swagger API documentation at GET /api/docs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs')
        .expect(200);

      expect(response.text).toContain('Swagger UI');
    });

    it('enforces rate limiting with 429 Too Many Requests when limit is exceeded', async () => {
      process.env.THROTTLE_LIMIT = '2';
      process.env.THROTTLE_TTL = '60000';

      const throttledModule: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const throttledApp = throttledModule.createNestApplication();
      configureApp(throttledApp);
      await throttledApp.init();

      try {
        await request(throttledApp.getHttpServer())
          .get('/api/health')
          .expect(200);
        await request(throttledApp.getHttpServer())
          .get('/api/health')
          .expect(200);

        const rateLimitedRes = await request(throttledApp.getHttpServer())
          .get('/api/health')
          .expect(429);

        expect(rateLimitedRes.body.statusCode).toBe(429);
        expect(rateLimitedRes.body.message).toBe(
          'Too many requests. Please try again later.',
        );
      } finally {
        process.env.THROTTLE_LIMIT = '100';
        await throttledApp.close();
      }
    });
  });
});
