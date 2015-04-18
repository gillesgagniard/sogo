/* -*- Mode: javascript; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

(function() {
  'use strict';

  /**
   * @name Account
   * @constructor
   * @param {object} futureAccountData
   */
  function Account(futureAccountData) {
    // Data is immediately available
    if (typeof futureAccountData.then !== 'function') {
      angular.extend(this, futureAccountData);
      _.each(this.identities, function(identity) {
        if (identity.fullName)
          identity.full = identity.fullName + ' <' + identity.email + '>';
        else
          identity.full = '<' + identity.email + '>';
      });
      Account.$log.debug('Account: ' + JSON.stringify(futureAccountData, undefined, 2));
    }
    else {
      // The promise will be unwrapped first
      //this.$unwrap(futureAccountData);
    }
  }

  /**
   * @memberof Account
   * @desc The factory we'll use to register with Angular
   * @returns the Account constructor
   */
  Account.$factory = ['$q', '$timeout', '$log', 'sgSettings', 'sgResource', 'sgMailbox', 'sgMessage', function($q, $timeout, $log, Settings, Resource, Mailbox, Message) {
    angular.extend(Account, {
      $q: $q,
      $timeout: $timeout,
      $log: $log,
      $$resource: new Resource(Settings.baseURL, Settings.activeUser),
      $Mailbox: Mailbox,
      $Message: Message
    });

    return Account; // return constructor
  }];

  /* Factory registration in Angular module */
  angular.module('SOGo.MailerUI')
    .factory('sgAccount', Account.$factory);

  /**
   * @memberof Account
   * @desc Set the list of accounts and instanciate a new Account object for each item.
   * @param {array} [data] - the metadata of the accounts
   * @returns the list of accounts
   */
  Account.$findAll = function(data) {
    var collection = [];
    if (data) {
      // Each entry is spun up as an Account instance
      angular.forEach(data, function(o, i) {
        o.id = i;
        collection[i] = new Account(o);
      });
    }
    return collection;
  };

  /**
   * @function $getMailboxes
   * @memberof Account.prototype
   * @desc Fetch the list of mailboxes for the current account.
   * @param {object} [options] - force a reload
   * @returns a promise of the HTTP operation
   */
  Account.prototype.$getMailboxes = function(options) {
    var _this = this,
        deferred = Account.$q.defer();

    if (this.$mailboxes && !(options && options.reload)) {
      deferred.resolve(this.$mailboxes);
    }
    else {
      Account.$Mailbox.$find(this).then(function(data) {
        _this.$mailboxes = data;
        deferred.resolve(_this.$mailboxes);
      });
    }

    return deferred.promise;
  };

  Account.prototype.$flattenMailboxes = function() {
    var _this = this,
        allMailboxes = [],
        _visit = function(level, mailboxes) {
          _.each(mailboxes, function(o) {
            allMailboxes.push({ id: o.id, path: o.path, name: o.name, level: level });
            if (o.children && o.children.length > 0) {
              _visit(level+1, o.children);
            }
          });
        };

    if (this.$$flattenMailboxes) {
      allMailboxes = this.$$flattenMailboxes;
    }
    else {
      _visit(0, this.$mailboxes);
      _this.$$flattenMailboxes = allMailboxes;
    }

    return allMailboxes;
  };

  Account.prototype.$getMailboxByType = function(type) {
    var mailbox,
        // Recursive find function
        _find = function(mailboxes) {
          var mailbox = _.find(mailboxes, function(o) {
            return o.type == type;
          });
          if (!mailbox) {
            angular.forEach(mailboxes, function(o) {
              if (!mailbox && o.children && o.children.length > 0) {
                mailbox = _find(o.children);
              }
            });
          }
          return mailbox;
        };
    mailbox = _find(this.$mailboxes);

    console.debug(mailbox);
    console.debug(this.specialMailboxes);
  };

  /**
   * @function $getMailboxByPath
   * @memberof Account.prototype
   * @desc Recursively find a mailbox using its path
   * @returns a promise of the HTTP operation
   */
  Account.prototype.$getMailboxByPath = function(path) {
    var mailbox = null,
        // Recursive find function
        _find = function(mailboxes) {
          var mailbox = _.find(mailboxes, function(o) {
            return o.path == path;
          });
          if (!mailbox) {
            angular.forEach(mailboxes, function(o) {
              if (!mailbox && o.children && o.children.length > 0) {
                mailbox = _find(o.children);
              }
            });
          }
          return mailbox;
        };
    mailbox = _find(this.$mailboxes);

    return mailbox;
  };

  /**
   * @function $newMailbox
   * @memberof Account.prototype
   * @desc Create a new mailbox on the server and refresh the list of mailboxes.
   * @returns a promise of the HTTP operations
   */
  Account.prototype.$newMailbox = function(path, name) {
    var _this = this,
        deferred = Account.$q.defer();

    Account.$$resource.post(path, 'createFolder', {name: name}).then(function() {
      _this.$getMailboxes({reload: true});
      deferred.resolve();
    }, function(response) {
      deferred.reject(response.error);
    });

    return deferred.promise;
  };

  /**
   * @function $newMessage
   * @memberof Account.prototype
   * @desc Prepare a new Message object associated to the appropriate mailbox.
   * @returns a promise of the HTTP operations
   */
  Account.prototype.$newMessage = function() {
    var _this = this,
        deferred = Account.$q.defer(),
        message;

    // Query account for draft folder and draft UID
    Account.$$resource.fetch(this.id.toString(), 'compose').then(function(data) {
      Account.$log.debug('New message: ' + JSON.stringify(data, undefined, 2));
      message = new Account.$Message(data.accountId, _this.$getMailboxByPath(data.mailboxPath), data);
      // Fetch draft initial data
      Account.$$resource.fetch(message.$absolutePath({asDraft: true}), 'edit').then(function(data) {
        Account.$log.debug('New message: ' + JSON.stringify(data, undefined, 2));
        angular.extend(message.editable, data);
        deferred.resolve(message);
      }, function(data) {
        deferred.reject(data);
      });
    }, function(data) {
      deferred.reject(data);
    });

    return deferred.promise;
  };

})();
