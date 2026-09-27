const configuredPort = process.env.GRAND_TRANSITION_TEST_PORT ?? '4173';

export const productionTestPort = Number(configuredPort);
if (
  !/^\d+$/u.test(configuredPort) ||
  !Number.isInteger(productionTestPort) ||
  productionTestPort < 1 ||
  productionTestPort > 65535
) {
  throw new Error('GRAND_TRANSITION_TEST_PORT must be an integer from 1 to 65535.');
}

export const productionOrigin = `http://127.0.0.1:${productionTestPort}`;
export const productionBaseURL = `${productionOrigin}/grand-transition/`;
