/** @param {NS} ns */
export async function main(ns) {

  const flags = ns.flags([
    ["mapMode", false]
  ]);

  while (true) {

    let servers = [];
    //scan all servers and populate the list 'servers'
    await recursiveScan("home", "home", "home");

    if (flags.mapMode) {
      servers.forEach(s => {
        ns.tprint(s.path);
      });
      return;
    }

    //count number of hacking tools you possess
    var numOfHackingTools = await getNumAvailableHackingTools();

    //filter out those you already have access to, or with hacking level exceeding your own
    var hackSkill = ns.getPlayer().skills.hacking;

    servers = servers.filter(s => !s.server.hasAdminRights && s.server.requiredHackingSkill <= hackSkill);

    //filter out those requiring more open ports than you have hacking tools for
    servers = servers.filter(s => s.server.numOpenPortsRequired <= numOfHackingTools);

    //for each server
    servers.forEach(s => {
      //apply each hacking tool you possess
      if (ns.fileExists("BruteSSH.exe"))
        ns.brutessh(s.server.hostname);
      if (ns.fileExists("FTPCrack.exe"))
        ns.ftpcrack(s.server.hostname)
      if (ns.fileExists("HTTPWorm.exe"))
        ns.httpworm(s.server.hostname)
      if (ns.fileExists("SQLInject.exe"))
        ns.sqlinject(s.server.hostname)
      if (ns.fileExists("relaySMTP.exe"))
        ns.relaysmtp(s.server.hostname)
      //run nuke.exe
      ns.nuke(s.server.hostname);
      ns.tprint("Nuked: " + s.server.hostname);
    });

    await ns.sleep(1000);

    async function recursiveScan(name, previousHost, totalPath) {
      var hostnames = ns.scan(name);

      for (var i = 0; i < hostnames.length; i++) {
        var hostName = hostnames[i];

        var server = ns.getServer(hostName);
        var serverWithPath = new ServerWithPath(server, totalPath + " " + hostName);

        if (hostName === "home" || hostName === previousHost) {
          continue;
        }
        servers.push(serverWithPath);
        //await UploadFiles(hostName);

        await recursiveScan(hostName, name, totalPath + " " + hostName);
      }

      return servers;
    }

    async function UploadFiles(hostName) {
      //if (!ns.fileExists("hack.js", hostName)) {
        ns.scp("hack.js", hostName);
        ns.scp("weaken.js", hostName);
        ns.scp("grow.js", hostName);
      //}
    }
  }

  async function getNumAvailableHackingTools() {
    var num = 0;
    if (ns.fileExists("BruteSSH.exe"))
      num++;
    if (ns.fileExists("FTPCrack.exe"))
      num++;
    if (ns.fileExists("HTTPWorm.exe"))
      num++;
    if (ns.fileExists("SQLInject.exe"))
      num++;
    if (ns.fileExists("relaySMTP.exe"))
      num++;
    return num;
  }
}

class ServerWithPath {
  constructor(server, path) {
    this.server = server;
    this.path = path;
  }
}