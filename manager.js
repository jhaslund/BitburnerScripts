/** @param {NS} ns */
export async function main(ns) {

  const flags = ns.flags([
    ["runOnHome", false],
    ["runOnHacknet", false],
    ["reserveRam", 0],
    ["percentage", 0.05]
  ]);

  //make busyServers where servers will be recorded with expected time 
  //to completion, to rejoin cycle (while loop)
  let busyServers = {};
  var debugI = 0;
  ns.disableLog("scan");

  while (true) {
    //release from busyServers servers whose time to completion have passed
    busyServers = await FilterOutReadyServers(busyServers);
    //Find most valuable server as defined by difficulty less then half of current skill and sorted by 
    //first ratio of available to max money, then max money (so as hacking level increases and we 
    //unlock newer servers, we won't waste the cycles spent on servers that would otherwise be ignored 
    //in favor of newer servers with more money, while still running cycles on newer servers as memory 
    //increases and new servers come online)
    //remove from this list servers who are in busyServers
    let allServerNames = [];
    let targetServerNames = [];
    let hostServerNames = [];

    if (flags.runOnHome)
      hostServerNames.push("home");
    hostServerNames = hostServerNames.concat(ns.getPurchasedServers());

    await RecursiveScan("home", "home", allServerNames);
    GetTargetAndHostServers(allServerNames, targetServerNames, hostServerNames);
    //targetServerNames = targetServerNames.filter(function (value) {
    //  return value === "joesguns";
    //});

    //Sort by best hackable server
    await SortMoneyServers(targetServerNames);

    //THE GOD LOOP
    for (var i = 0; i < targetServerNames.length; i++) {
      var targetServerName = targetServerNames[i];
      //ns.tprint("Beginning to hack " + targetServerName);
      //ns.tprint("targetServerName: " + targetServerName)
      var targetServer = ns.getServer(targetServerName);
      var difficultyToReduce = targetServer.hackDifficulty - targetServer.minDifficulty;
      var moneyMultiplierNeeded = targetServer.moneyMax / targetServer.moneyAvailable;
      var weakenRamCost = ns.getScriptRam("weaken.js");
      var weakenExecutionTime = ns.getWeakenTime(targetServerName);
      var hackExecutionTime = ns.getHackTime(targetServerName);
      var growRamCost = ns.getScriptRam("grow.js");
      var growExecutionTime = ns.getGrowTime(targetServerName);
      var milisecondsPassed = 0;

      //IF 
      //not already at minimum/maximum, WGW to reach minimum security and maximum money. Print notification of 
      //this and record server name in serverCycleList with expected time to finish, allocating as much ram 
      //is needed up to available ram, then continue to next server.
      if (difficultyToReduce > 0 || moneyMultiplierNeeded > 1) {
        //ns.tprint("Decided to prepare target server");
        var weaken1Threads = Math.ceil(difficultyToReduce / 0.05);

        //Delegates weaken1 operations
        if (weaken1Threads > 0) {
          var weaken1ThreadsRemaining = weaken1Threads;
          for (var j = 0; j < hostServerNames.length && weaken1ThreadsRemaining > 0; j++) {

            var hostServerName = hostServerNames[j];
            //ns.tprint("hostServerName: " + hostServerName);
            var hostServer = ns.getServer(hostServerName);
            var freeRam = hostServer.maxRam - hostServer.ramUsed;
            if (hostServerName === "home")
              freeRam -= flags.reserveRam;
            var weaken1ThreadsCanRun = Math.floor(freeRam / weakenRamCost);
            var weaken1ThreadsToRun = Math.min(weaken1ThreadsRemaining, weaken1ThreadsCanRun);

            if (weaken1ThreadsToRun > 0) {
              //ns.tprint("weaken1ThreadsToRun: " + weaken1ThreadsToRun);
              ns.exec("weaken.js", hostServerName, weaken1ThreadsToRun, targetServerName, 0 + milisecondsPassed);
              weaken1ThreadsRemaining -= weaken1ThreadsToRun;
              //ns.tprint(hostServerName + " ran " + weaken1ThreadsToRun + " weaken threads against " + targetServerName +
              //  " to reduce security from " + targetServer.hackDifficulty + " to " + (targetServer.hackDifficulty - (weaken1ThreadsToRun * 0.05)));
              //ns.tprint("weaken1ThreadsRemaining: " + weaken1ThreadsRemaining);
            }
          }

          var expectedDateToCompletion = new Date(Date.now());
          expectedDateToCompletion.setMilliseconds(expectedDateToCompletion.getMilliseconds() + weakenExecutionTime + 50);
          if (weaken1ThreadsRemaining != weaken1Threads)
            busyServers[targetServerName] = new ServerTime(targetServerName, expectedDateToCompletion, targetServer.moneyMax);

          //out of memory on all servers, break out of for loop
          if (weaken1ThreadsRemaining > 0) {
            //ns.tprint("Ran " + (weaken1Threads - weaken1ThreadsRemaining) + " weaken threads.");
            //ns.tprint("Remains " + weaken1ThreadsRemaining + " weaken threads to reduce " + targetServerName);
            //ns.tprint("Out of memory on all servers, waiting 500ms and trying again from the top");
            //ns.tprint("Expected date to completion: " + expectedDateToCompletion);
            break;
          }
        }

        var formulaServer = ns.getServer(targetServerName);
        formulaServer.hackDifficulty = formulaServer.minDifficulty;
        var fGthreads = ns.formulas.hacking.growThreads(formulaServer, ns.getPlayer(), formulaServer.moneyMax);
        var growThreads = Math.ceil(fGthreads);

        //Delegates growth operations
        if (growThreads > 0 && targetServer.moneyAvailable != targetServer.moneyMax) {
          var growThreadsRemaining = growThreads;
          for (var j = 0; j < hostServerNames.length && growThreadsRemaining > 0; j++) {

            var hostServerName = hostServerNames[j];
            //ns.tprint("hostServerName: " + hostServerName);
            var hostServer = ns.getServer(hostServerName);
            var freeRam = hostServer.maxRam - hostServer.ramUsed;
            if (hostServerName === "home")
              freeRam -= flags.reserveRam;
            var growThreadsCanRun = Math.floor(freeRam / growRamCost);
            var growThreadsToRun = Math.min(growThreadsRemaining, growThreadsCanRun);

            if (growThreadsToRun > 0) {
              //ns.tprint("weaken1ThreadsToRun: " + weaken1ThreadsToRun);
              var growSleep = weakenExecutionTime - growExecutionTime + 50;
              ns.exec("grow.js", hostServerName, growThreadsToRun, targetServerName, growSleep + milisecondsPassed);
              growThreadsRemaining -= growThreadsToRun;
              //ns.tprint(hostServerName + " ran " + growThreadsToRun + " grow threads against " + targetServerName +
              //  " to increase money from " + formulaServer.moneyAvailable + " to " + formulaServer.moneyMax);
              //ns.tprint("weaken1ThreadsRemaining: " + weaken1ThreadsRemaining);
            }
          }

          var expectedDateToCompletion = new Date(Date.now());
          expectedDateToCompletion.setMilliseconds(expectedDateToCompletion.getMilliseconds() + weakenExecutionTime + 50);
          if (growThreadsRemaining != growThreads)
            busyServers[targetServerName] = new ServerTime(targetServerName, expectedDateToCompletion, targetServer.moneyMax);

          //out of memory on all servers, break out of for loop
          if (growThreadsRemaining > 0) {
            //ns.tprint("Ran " + (growThreads - growThreadsRemaining) + " grow threads.");
            //ns.tprint("Remains " + growThreadsRemaining + " grow threads to grow " + targetServerName);
            // ns.tprint("Out of memory on all servers, waiting 500ms and trying again from the top");
            //ns.tprint("Expected date to completion: " + expectedDateToCompletion);
            break;
          }
        }

        var weaken2Threads = Math.ceil((growThreads * 0.004) / 0.05);

        //Delegates weaken operations
        if (weaken2Threads > 0) {
          var weaken2ThreadsRemaining = weaken2Threads;
          for (var j = 0; j < hostServerNames.length && weaken2ThreadsRemaining > 0; j++) {

            var hostServerName = hostServerNames[j];
            //ns.tprint("hostServerName: " + hostServerName);
            var hostServer = ns.getServer(hostServerName);
            var freeRam = hostServer.maxRam - hostServer.ramUsed;
            if (hostServerName === "home")
              freeRam -= flags.reserveRam;
            var weaken2ThreadsCanRun = Math.floor(freeRam / weakenRamCost);
            var weaken2ThreadsToRun = Math.min(weaken2ThreadsRemaining, weaken2ThreadsCanRun);

            if (weaken2ThreadsToRun > 0) {
              //ns.tprint("weaken1ThreadsToRun: " + weaken1ThreadsToRun);
              var weaken2Sleep = 100;
              ns.exec("weaken.js", hostServerName, weaken2ThreadsToRun, targetServerName, weaken2Sleep + milisecondsPassed);
              weaken2ThreadsRemaining -= weaken2ThreadsToRun;
              //ns.tprint(hostServerName + " ran " + weaken2ThreadsToRun + " weaken threads against " + targetServerName +
              //  " to reduce security from " + (targetServer.minDifficulty + (0.004 * growThreads)) + " to " + targetServer.minDifficulty);
              //ns.tprint("weaken1ThreadsRemaining: " + weaken1ThreadsRemaining);
            }
          }

          var expectedDateToCompletion = new Date(Date.now());
          expectedDateToCompletion.setMilliseconds(expectedDateToCompletion.getMilliseconds() + weakenExecutionTime + 150);
          if (weaken2ThreadsRemaining != weaken2Threads)
            busyServers[targetServerName] = new ServerTime(targetServerName, expectedDateToCompletion, targetServer.moneyMax);

          //out of memory on all servers, break out of for loop
          if (weaken2ThreadsRemaining > 0) {
            //ns.tprint("Ran " + (weaken2Threads - weaken2ThreadsRemaining) + " weaken threads.");
            //ns.tprint("Remains " + weaken2ThreadsRemaining + " weaken threads to reduce " + targetServerName);
            //ns.tprint("Out of memory on all servers, waiting 500ms and trying again from the top");
            //ns.tprint("Expected date to completion: " + expectedDateToCompletion);
            break;
          }
        }
      }
      else {
        //Run batches on this server until out of memory on home and purchased servers, or we have reached expected 
        //completion time of first operation of this cycle. then record server name in serverCycleList when 
        //last weaken of this cycle will finish
        //cancels and restart god loop from the beginning if a more profitable server unlocks
        //ns.tprint("Decided to HGWG target server");
        var moreProfitableServer = await AnyServersInListHasHigherMaxMoneyThanTargetServer(busyServers, targetServer);
        if (moreProfitableServer != null) {
          ns.tprint("Breaking out of hacking " + targetServerName + " to instead hack " + moreProfitableServer.name);
          break;
        }

        var percentageToHackPerCycle = flags.percentage; //default 0.05
        var threadsToHack = Math.ceil(percentageToHackPerCycle / ns.hackAnalyze(targetServerName));
        var weaken1Threads = Math.ceil(threadsToHack * 0.002 / 0.05);
        var hackedMoney = ns.hackAnalyze(targetServerName) * threadsToHack * targetServer.moneyAvailable;
        var growThreads = Math.ceil(ns.growthAnalyze(targetServerName, targetServer.moneyMax / (targetServer.moneyMax - hackedMoney)));
        var weaken2Threads = Math.ceil(growThreads * 0.004 / 0.05);
        var totalRamCost =
          (weakenRamCost * (weaken1Threads + weaken2Threads)) +
          (growRamCost * growThreads) +
          (ns.getScriptRam("hack.js") * threadsToHack);

        const currentTimeAsMs = Date.now();
        const adjustedTimeAsMs = currentTimeAsMs + weakenExecutionTime - 200;
        var beginningOfCycle = new Date(adjustedTimeAsMs);
        var endOfCycle = null;

        for (var j = 0; j < hostServerNames.length; j++) {

          var hostServerName = hostServerNames[j];
          //ns.tprint("hostServerName: " + hostServerName);
          var hostServer = ns.getServer(hostServerName);
          var freeRam = hostServer.maxRam - hostServer.ramUsed;
          if (hostServerName === "home")
            freeRam -= flags.reserveRam;

          while (freeRam >= totalRamCost) {
            if (beginningOfCycle < new Date(Date.now())) {
              break;
            }

            var moreProfitableServer = await AnyServersInListHasHigherMaxMoneyThanTargetServer(busyServers, targetServer);
            if (moreProfitableServer != null) {
              ns.tprint("Breaking out of hacking " + targetServerName + " to instead hack " + moreProfitableServer.name);
              break;
            }

            freeRam -= totalRamCost;
            freeRam -= totalRamCost;
            var hackSleep = weakenExecutionTime - hackExecutionTime - 50;
            var weaken1Sleep = 0;
            var growSleep = weakenExecutionTime - growExecutionTime + 50;
            var weaken2Sleep = 100;

            ns.exec("hack.js", hostServerName, threadsToHack, targetServerName, hackSleep + milisecondsPassed);
            ns.exec("weaken.js", hostServerName, weaken1Threads, targetServerName, weaken1Sleep + milisecondsPassed);
            ns.exec("grow.js", hostServerName, growThreads, targetServerName, growSleep + milisecondsPassed);
            ns.exec("weaken.js", hostServerName, weaken2Threads, targetServerName, weaken2Sleep + milisecondsPassed);

            var timeNow = Date.now();
            var timeWhenWeaken2Finished = timeNow + weakenExecutionTime + weaken2Sleep;
            endOfCycle = new Date(timeWhenWeaken2Finished + 50);
            busyServers[targetServerName] = new ServerTime(targetServerName, endOfCycle, targetServer.moneyMax);

            var moneyToBeHacked = threadsToHack * (ns.hackAnalyze(targetServerName) * ns.getServer(targetServerName).moneyAvailable);
            var multiplicationFactorForGrowThreads = targetServer.moneyMax / (targetServer.moneyMax - hackedMoney);
            var moneyOnServerAfterHack = targetServer.moneyAvailable - moneyToBeHacked;
            var moneyOnServerAfterGrow = moneyOnServerAfterHack * multiplicationFactorForGrowThreads;
            var moneyGained = moneyOnServerAfterGrow - moneyOnServerAfterHack;
            //ns.tprint("moneyToBeHacked: " + moneyToBeHacked);
            //ns.tprint("multiplicationFactorForGrowThreads: " + multiplicationFactorForGrowThreads);
            //ns.tprint("moneyOnServerAfterHack: " + moneyOnServerAfterHack);
            //ns.tprint("moneyOnServerAfterGrow: " + moneyOnServerAfterGrow);
            //ns.tprint("moneyGained: " + moneyGained);


            //ns.tprint("Started " + threadsToHack + " hack threads against " + targetServerName +
            //  " to reduce server money by " + moneyToBeHacked);
            //ns.tprint("Started " + growThreads + " grow threads against " + targetServerName +
            //  " to grow server money by " + moneyGained);
            //await ns.sleep(200);
            milisecondsPassed += 200;
          }

          var moreProfitableServer = await AnyServersInListHasHigherMaxMoneyThanTargetServer(busyServers, targetServer);
          if (moreProfitableServer != null) {
            ns.tprint("Breaking out of hacking " + targetServerName + " to instead hack " + moreProfitableServer.name);
            break;
          }

          if (beginningOfCycle < new Date(Date.now())) {
            break;
          }
        }
      }

      var moreProfitableServer = await AnyServersInListHasHigherMaxMoneyThanTargetServer(busyServers, targetServer);
      if (moreProfitableServer != null) {
        ns.tprint("Breaking out of hacking " + targetServerName + " to instead hack " + moreProfitableServer.name);
        break;
      }
    }
    
    //if the code has reached this place we have hacked all available servers or spent all our memory
    //ns.tprint("We have hacked all available servers/spent all our ram, waiting 10 seconds")
    //await ns.sleep(250);
    await ns.sleep(10 * 1000);
    //milisecondsPassed += 250;

  }

  async function GetTargetAndHostServers(hostNames, servers1, servers2) {

    for (var i = 0; i < hostNames.length; i++) {

      var server = ns.getServer(hostNames[i]);

      if (server.moneyMax > 0 && server.requiredHackingSkill <= (ns.getPlayer().skills.hacking / 2) &&
        busyServers[hostNames[i]] == null && server.hasAdminRights) {
        servers1.push(hostNames[i]);
      }
      if (server.maxRam > 0 && server.hasAdminRights && !server.purchasedByPlayer)
        servers2.push(hostNames[i]);
    }
  }

  async function SortMoneyServers(servers) {
    servers = servers.sort((a, b) => ns.getServer(b).moneyMax - ns.getServer(a).moneyMax);
    //servers = servers.sort((a, b) => (ns.getServer(b).moneyAvailable / ns.getServer(b).moneyMax) - (ns.getServer(a).moneyAvailable / ns.getServer(a).moneyMax));
  }

  async function AnyServersInListHasHigherMaxMoneyThanTargetServer(busyServers, targetServer) {
    var mostProfitableServer = null;

    for (const [key, value] of Object.entries(busyServers)) {
      if (value.time > new Date(Date.now()))
        continue;
      if (value.maxMoney > targetServer.moneyMax) {
        if (mostProfitableServer == null || mostProfitableServer.maxMoney < value.maxMoney)
          mostProfitableServer = value;
      }
    }

    return mostProfitableServer;
  }

  async function FilterOutReadyServers(servers) {
    var now = new Date(Date.now());

    // Use Object.keys() to get an array of keys (server names)
    let filteredServers = Object.keys(servers).filter(function (server) {
      // Use the server name to access the value from the original object
      return servers[server].time > now; // Change the condition as needed
    });

    // Create a new object with only the filtered elements
    let result = {};
    filteredServers.forEach(function (server) {
      result[server] = servers[server];
    });
    return result;
  }

  async function RecursiveScan(name, previousHost, servers) {
    var hostnames = ns.scan(name);

    for (var i = 0; i < hostnames.length; i++) {
      var hostName = hostnames[i];

      if (hostName === "home" || hostName === previousHost) {
        continue;
      }

      servers.push(hostName);
      await UploadFiles(hostName);

      await RecursiveScan(hostName, name, servers);
    }
  }

  async function UploadFiles(hostName) {
    if (!ns.fileExists("hack.js", hostName)) {
      ns.scp("hack.js", hostName);
      ns.scp("weaken.js", hostName);
      ns.scp("grow.js", hostName);
    }
  }
}

class ServerTime {
  constructor(name, time, maxMoney) {
    this.name = name;
    this.time = time;
    this.maxMoney = maxMoney;
  }
}