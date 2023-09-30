/** @param {NS} ns */
export async function main(ns) {
  let servers = [];
  await recursiveScan("home", "home");
  var hackSkill = ns.getPlayer().skills.hacking;

  servers = servers.filter(s =>
    s.moneyMax > 0 &&
    s.hasAdminRights &&
    ((s.requiredHackingSkill * 2) <= hackSkill || s.hostname === "n00dles")
  );

  servers.sort((a, b) => a.moneyMax - b.moneyMax);
ns.getServer().moneyMax
  servers.forEach(s => {
    ns.tprint("MinSec: " + s.minDifficulty.toString().padStart(2, "0") + "(" + s.hackDifficulty + ")" + 
    "; Growthrate: " + s.serverGrowth.toString().padStart(4, "0") + "; MaxMoney: " + s.moneyMax + "m" + 
    "(" + (Math.trunc((s.moneyAvailable / s.moneyMax) * 100)/100) + ")" + "; Name: " + s.hostname);
  });

  async function recursiveScan(name, previousHost) {
    var hostnames = ns.scan(name);

    for (var i = 0; i < hostnames.length; i++) {
      var hostName = hostnames[i];

      var server = ns.getServer(hostName);

      if (hostName === "home" || hostName === previousHost) {
        continue;
      }
      servers.push(server);

      await recursiveScan(hostName, name, servers);
    }

    return servers;
  }
}