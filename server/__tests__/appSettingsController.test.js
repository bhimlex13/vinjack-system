const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getSetting, updateSetting } = require('../controllers/appSettingsController'); // Adjust path
const Setting = require('../models/settingModel'); // Adjust path

let mongoServer;

// --- Mock Express Request & Response ---
const mockRequest = (params, body) => ({
  params: params || {},
  body: body || {},
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// ------------------------------------

let testSetting;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  await Setting.deleteMany({});

  // --- CREATE MOCK DATA ---
  testSetting = await new Setting({
    key: 'storeName',
    value: 'Vinjack POS'
  }).save();
});

// --- Test Suite for getSetting ---
describe('getSetting', () => {

  test('Should return a setting by its key', async () => {
    const req = mockRequest({ key: 'storeName' }); // Mock req.params.key
    const res = mockResponse();

    await getSetting(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      key: 'storeName',
      value: 'Vinjack POS'
    }));
  });

  test('Should return 404 if setting key is not found', async () => {
    const req = mockRequest({ key: 'nonExistentKey' });
    const res = mockResponse();

    await getSetting(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Setting not found' });
  });

  test('Should return 500 on server error', async () => {
    // Force an error
    jest.spyOn(Setting, 'findOne').mockImplementationOnce(() => {
      throw new Error('Test DB Error');
    });

    const req = mockRequest({ key: 'storeName' });
    const res = mockResponse();

    await getSetting(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Server Error' });
  });
});

// --- Test Suite for updateSetting ---
describe('updateSetting', () => {

  test('Should update an existing setting', async () => {
    const reqBody = {
      key: 'storeName',
      value: 'New Store Name'
    };
    const req = mockRequest(null, reqBody);
    const res = mockResponse();

    await updateSetting(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      key: 'storeName',
      value: 'New Store Name'
    }));

    // Check DB
    const settingInDb = await Setting.findOne({ key: 'storeName' });
    expect(settingInDb.value).toBe('New Store Name');
  });

  test('Should create a new setting if key does not exist (upsert)', async () => {
    const reqBody = {
      key: 'storeAddress',
      value: '123 Main St'
    };
    const req = mockRequest(null, reqBody);
    const res = mockResponse();

    await updateSetting(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      key: 'storeAddress',
      value: '123 Main St'
    }));

    // Check DB
    const settingInDb = await Setting.findOne({ key: 'storeAddress' });
    expect(settingInDb.value).toBe('123 Main St');
    const count = await Setting.countDocuments();
    expect(count).toBe(2); // The original testSetting + this new one
  });

  test('Should return 400 on validation error (e.g., missing value)', async () => {
    const reqBody = {
      key: 'storePhone'
      // 'value' is missing, which is required by the model
    };
    const req = mockRequest(null, reqBody);
    const res = mockResponse();

    await updateSetting(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error updating setting' });
  });
});