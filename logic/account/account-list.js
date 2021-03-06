/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 * Not any newer versions of these licenses
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Beonex Mail Notifier and Mozilla Thunderbird
 *
 * The Initial Developer of the Original Code is
 *  Ben Bucksch <ben.bucksch beonex.com>
 * Portions created by the Initial Developer are Copyright (C) 2010 - 2017
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * This keeps the list of all account objects created.
 */

var util = require("util/util");
util.importAll(util, global);
util.importAll(require("util/collection"), global);
var sanitize = require("util/sanitizeDatatypes").sanitize;
var ourPref = require("util/preferences").myPrefs;

/**
 * Contains all Account objected created.
 * {Map accountID -> Account}
 */
var gAccounts = new MapColl();

var gHaveReadAll = false;

/**
 * Returns all accounts from prefs and local objects
 * @returns |Map|
 */
function getAllAccounts()
{
  if ( !gHaveReadAll)
  {
    ourPref.get("accountsList", "").split(",").forEach(function(accountID)
    {
      if ( !accountID)
        return;
      if (gAccounts.get(accountID))
        return;
      try {
        _readExistingAccountFromPrefs(accountID); // adds to gAccounts
      } catch (e) { errorInBackend(e); }
    }, this);
    gHaveReadAll = true;
  }

  return gAccounts;
}

function _readExistingAccountFromPrefs(accountID)
{
  sanitize.nonemptystring(accountID);
  var type = ourPref.get("account." + accountID + ".type", null);
  assert(type, "account does not exist in prefs");
  gAccounts.set(accountID, _newAccountOfType(type, accountID, false));
  return gAccounts.get(accountID);
}

/**
 * Returns the |Account| object for |emailAddress|.
 * If the account does not exist yet, returns null;
 */
function getExistingAccountForEmailAddress(emailAddress) {
  sanitize.nonemptystring(emailAddress);
  return getAllAccounts().filter(function(acc) {
    return acc.emailAddress == emailAddress;
  })[0];
}

/**
 * Returns a fake |Account| object with a summary of all accounts.
 * @returns {
 *   isLoggedIn {Boolean}   any of the accounts is logged in
 *   newMailCount {Integer}   total of new mails in all accounts
 *   accountCount {Integer}   number of accounts
 * }
 */
function accountsSummary() {
  var result = {
    isLoggedIn : false,
    newMailCount : 0,
    accountCount : 0,
  };
  getAllAccounts().forEach(function(acc)
  {
    result.accountCount += 1;
    if (acc.newMailCount > 0)
      result.newMailCount += acc.newMailCount;
    if (acc.isLoggedIn)
      result.isLoggedIn = true;
  });
  return result;
}

/**
 * Our IMAP connection is persistent.
 *
 * This means that when we shutdown, we need to kill the connection.
 *
 * The profile-change-net-teardown notification happens before the network
 * connection is dropped, so it is the correct time to do this.
 */
var netTeardownListener =
{
  observe : function() {
    getAllAccounts().forEach(account => account.logout());
  }
}
// TODO Port
//Services.obs.addObserver(netTeardownListener, "profile-change-net-teardown", false);


exports.getAllAccounts = getAllAccounts;
exports.accountsSummary = accountsSummary;
exports.getExistingAccountForEmailAddress = getExistingAccountForEmailAddress;
