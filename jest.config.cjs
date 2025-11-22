module.exports = {
  testEnvironment: '<rootDir>/test/CanvasSafeEnvironment.cjs',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.js'],
  moduleNameMapper: {
    '\\.(?:frag|vert)$': '<rootDir>/test/mocks/shaderMock.js',
    '^canvas$': '<rootDir>/test/mocks/canvasMock.js'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
