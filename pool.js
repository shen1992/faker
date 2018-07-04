const puppeteer =  require('puppeteer');
const genericPool = require('generic-pool');

const initPuppeteerPool = ({
                             max = 10,
                             // optional. if you set this, make sure to drain() (see step 3)
                             min = 2,
                             // specifies how long a resource can stay idle in pool before being removed
                             idleTimeoutMillis = 30000,
                             // specifies the maximum number of times a resource can be reused before being destroyed
                             puppeteerArgs = [],
                             ...otherConfig
                           } = {}) => {
  // TODO: randomly destroy old instances to avoid resource leak?
  const factory = {
    create: () => puppeteer.launch(...puppeteerArgs).then(instance => instance),
    destroy: (instance) => {
      instance.close()
    }
  };
  const config = {
    max,
    min,
    idleTimeoutMillis,
    ...otherConfig,
  };
  const pool = genericPool.createPool(factory, config);
  const genericAcquire = pool.acquire.bind(pool);
  pool.acquire = () => genericAcquire().then(instance => {
    return instance
  });
  pool.use = (fn) => {
    let resource;
    return pool.acquire()
      .then(r => {
        resource = r;
        return resource
      })
      .then(fn)
      .then((result) => {
        pool.release(resource);
        return result
      }, (err) => {
        pool.release(resource);
        throw err
      })
  };

  return pool
};

const pool = initPuppeteerPool({
  max: 10, // default
  min: 2, // default
  // how long a resource can stay idle in pool before being removed
  idleTimeoutMillis: 30000, // default.
  // For all opts, see opts at https://github.com/coopernurse/node-pool#createpool
  puppeteerArgs: [{ignoreHTTPSErrors: true, args: []}]
});

process.setMaxListeners(20);

module.exports = pool;