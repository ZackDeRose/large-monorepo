const cp = require('child_process');
const path = require('path');
const os = require('os');

const NUMBER_OF_RUNS = 100;

function message(m) {
  console.log('------------------------');
  console.log(m);
  console.log('------------------------');
}

function cleanFolders() {
  // uncomment this to remove all artifacts after every run
  // cp.execSync(
  //   'rm -rf apps/crew/.next && rm -rf apps/flight-simulator/.next && rm -rf apps/navigation/.next && rm -rf apps/ticket-booking/.next && rm -rf apps/warp-drive-manager/.next'
  // );
}

function spawnSync(cmd, args) {
  return cp.spawnSync(
    path.join(
      '.',
      'node_modules',
      '.bin',
      os.platform() === 'win32' ? cmd + '.cmd' : cmd
    ),
    args,
    {
      stdio: 'inherit',
      env: { ...process.env, NX_TASKS_RUNNER_DYNAMIC_OUTPUT: 'false' },
    }
  );
}
const results = {};

function getInstalledNxVersion() {
  const { stdout } = cp.spawnSync('cat', ['node_modules/nx/package.json']);
  const asJSON = JSON.parse(stdout.toString());
  return asJSON.version;
}

function runNxVersion(version) {
  console.log('installing latest nx version based on version: ', version);
  cp.execSync(`npm add -D nx@~${version}`);
  const nxVersion = getInstalledNxVersion();
  console.log('actual version: ', nxVersion);

  message(`prepping nx@${nxVersion}`);
  // we don't have to run it twice :)
  spawnSync('nx', ['run-many', '--target=build', '--all']);

  message(`running nx@${nxVersion} ${NUMBER_OF_RUNS} times`);
  let nxTime = 0;
  const details = [];
  for (let i = 0; i < NUMBER_OF_RUNS; ++i) {
    cleanFolders();
    const b = new Date();
    const { stdout } = cp.spawnSync(
      'nx',
      ['run-many', '--target=build', '--all', '--parallel', 10],
      { env: { ...process.env, NX_PERF_LOGGING: 'true' } }
    );
    const a = new Date();
    nxTime += a.getTime() - b.getTime();

    console.log(`The command ran in ${a.getTime() - b.getTime()}ms`);
    details.push(parseOutput(stdout.toString()));
  }
  const averageNxTime = nxTime / NUMBER_OF_RUNS;
  results[nxVersion] = averageResults(details);
  results[nxVersion].commandWallTime = averageNxTime;

  // message('prepping lerna');
  // spawnSync('lerna', ['run', 'build', `--concurrency=3`]);
  // message(`running lerna ${NUMBER_OF_RUNS} times`);
  // let lernaTime = 0;
  // for (let i = 0; i < NUMBER_OF_RUNS; ++i) {
  //   cleanFolders();
  //   const b = new Date();
  //   spawnSync('lerna', ['run', 'build', `--concurrency=10`]);
  //   const a = new Date();
  //   lernaTime += a.getTime() - b.getTime();
  //   console.log(`The command ran in ${a.getTime() - b.getTime()}ms`);
  // }
  // const averageLernaTime = lernaTime / NUMBER_OF_RUNS;

  // message('prepping lage');
  // spawnSync('lage', ['build', '--concurrency', 3]);

  // message(`running lage ${NUMBER_OF_RUNS} times`);
  // let lageTime = 0;
  // for (let i = 0; i < NUMBER_OF_RUNS; ++i) {
  //   cleanFolders();
  //   const b = new Date();
  //   spawnSync('lage', ['build', '--concurrency', 10]);
  //   const a = new Date();
  //   lageTime += a.getTime() - b.getTime();
  //   console.log(`The command ran in ${a.getTime() - b.getTime()}ms`);
  // }
  // const averageLageTime =
  //     lageTime / NUMBER_OF_RUNS;

  // message('results');
  // console.log(`average lage time is: ${averageLageTime}`);
  // console.log(`average turbo time is: ${averageTurboTime}`);
  // console.log(`average lerna (powered by nx) time is: ${averageLernaTime}`);

  // console.log(`nx is ${averageLageTime / averageNxTime}x faster than lage`);
  // console.log(`nx is ${averageTurboTime / averageNxTime}x faster than turbo`);
  // console.log(`nx is ${averageLernaTime / averageNxTime}x faster than lerna (powered by nx)`);
}

const versions = [
  '15.0.0',
  '15.1.0',
  '15.2.0',
  '15.3.0',
  '15.4.0',
  '15.5.0',
  '15.6.0',
  '15.7.0',
  '15.8.0',
];

for (const version of versions) {
  runNxVersion(version);
}
// for (const [installedVersion, averageNxTime] of Object.entries(results)) {
//   console.log(`nx@${installedVersion}:`, results);
// }

console.log('results');
console.log(JSON.stringify(results, null, 2));

function parseOutput(output) {
  console.log(`===== parsing output =====`);
  const lines = output.split('\n');
  const linesWithTime = lines.filter((l) => l.startsWith('Time for '));
  const result = {};
  for (const line of linesWithTime) {
    const foo = line.split(`'`);
    console.log(foo);
    const [_, name, time] = line.split(`'`);
    let propName = name;
    let count = 0;
    while (result[propName]) {
      count++;
      propName = `${name} [${count}]`;
    }
    result[propName] = +time;
  }
  console.log(`===== done parsing output =====`);
  return result;
}

function averageResults(results) {
  const averages = {};
  for (const result of results) {
    for (const [name, time] of Object.entries(result)) {
      if (!averages[name]) {
        averages[name] = time;
      }
      averages[name] += time;
    }
  }
  for (const [name, time] of Object.entries(averages)) {
    averages[name] = time / results.length;
  }
  return averages;
}
