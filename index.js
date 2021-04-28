const crypto = require('crypto');
const path = require('path');
const { createLambda } = require('@vercel/build-utils/lambda.js');
const glob = require('@vercel/build-utils/fs/glob.js');
const objectHash = require('object-hash');

exports.analyze = ({ files, entrypoint, config }) => {
  const entrypointHash = files[entrypoint].digest;
  const objHash = objectHash(config, { algorithm: 'sha256' });
  const combinedHashes = [entrypointHash, objHash].join('');

  return crypto
    .createHash('sha256')
    .update(combinedHashes)
    .digest('hex');
};

exports.build = async ({ files, entrypoint, config }) => {
  const launcherFiles = await glob('**', path.join(__dirname, 'dist'));
  const zipFiles = { ...files, ...launcherFiles };

  const { port, timeout, cmds } = Object.assign(
    {
      port: 8080,
      timeout: 5000,
      cmds: [["true"]]
    },
    config || {},
  );
  const process = require('child_process');

  for (var i = 0; i < cmds.length; i++) {
    var cmd = cmds[i].shift();
    if (!cmd) {
      process.spawn(cmd, cmds[i], { stdio: 'inherit' })
    }
  }

  const lambda = await createLambda({
    files: zipFiles,
    handler: 'launcher',
    runtime: 'go1.x',
    environment: {
      NOW_STATIC_BIN_LOCATION: entrypoint,
      NOW_STATIC_BIN_PORT: '' + port,
      NOW_STATIC_BIN_TIMEOUT: '' + timeout,
    },
  });

  return { [entrypoint]: lambda };
};
