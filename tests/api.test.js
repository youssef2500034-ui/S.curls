const request = require('supertest');

jest.mock('../models/mydataschema', () => {
  const mockProduct = {
    _id: 'prod-test',
    name: 'Test Product',
    price: 123,
    toJSON() { return { _id: this._id, name: this.name, price: this.price }; },
  };
  return {
    Stylist: {},
    Pricing: {},
    Gallery: {},
    Booking: {},
    Article: {},
    Employee: {},
    Attendance: {},
    Rating: {},
    Testimonial: {},
    Message: {},
    Order: {},
    SessionToken: {},
    Product: {
      find: jest.fn().mockResolvedValue([mockProduct]),
      findById: jest.fn().mockResolvedValue({ ...mockProduct }),
    },
  };
});

const app = require('../app');

describe('API smoke tests', () => {
  it('responds to health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('lists products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe('Test Product');
  });
});
