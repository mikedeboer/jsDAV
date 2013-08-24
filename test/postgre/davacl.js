/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Daniel Laxar
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var postgre = require('../../lib/shared/backends/postgre.js');
var p = require('../../lib/DAVACL/backends/postgre.js');
var db = require('./db.js');
var pInstance;
var expect = require('chai').expect;
var client;

describe('davacl', function () {
  before(function(done) {
    db.init(function (err) {
      if(err) {
        done(err);
      }
      else {
        postgre.getConnection(db.c, function(err, cl) {
          if(err) {
            done(err);
          }
          else {
            client = cl;
            pInstance = p.new(client);

            done();
          }
        });   
      }
    });
  });

  it('getPrincipalsByPrefix# should return an empty principal array if the prefix does not match', function(done) {
    pInstance.getPrincipalsByPrefix('notexist/', function(err, users) {
      if(err) {
        return done(err);
      }
      expect(users).to.have.length(0);
      done();
    });
  });

  it('getPrincipalsByPrefix# should return a principal array if the prefix matches', function(done){
    pInstance.getPrincipalsByPrefix('principals/', function(err, users) {
      if(err) {
        return done(err);
      }
      expect(users).to.be.an('array');
      expect(users).to.have.length(2);
      done();
    });
  });

  it('getPrincipalsByPath# should be undefined if the path does not match', function(done) {
    pInstance.getPrincipalByPath('principals/daniel1', function(err, users) {
      if(err) {
        return done(err);
      }
      expect(users).to.be.undefined;
      done();
    });
  });

  it('getPrincipalsByPath# should return a principal array if the path matches', function(done){
    pInstance.getPrincipalByPath('principals/daniel', function(err, users) {
      if(err) {
        return done(err);
      }
      expect(users).to.be.an('object');
      done();
    });
  });

  it('updatePrincipal# should update correctly', function(done) {
      pInstance.updatePrincipal('principals/daniel', {'{DAV:}displayname': 'Daniel (MOD)', '{http://ajax.org/2005/aml}vcard-url': '/newurl'}, function(err, result) {
        client.query('SELECT * FROM principals WHERE uri=$1', ['principals/daniel'], function(err, result) {
          if(err) {  
            done(err);
          }
          else {
            expect(result.rows).to.have.length(1);

            expect(result.rows[0]).to.have.property('displayname')
              .to.be.eq('Daniel (MOD)');

            expect(result.rows[0]).to.have.property('vcardurl')
              .to.be.eq('/newurl');

            expect(result.rows[0]).to.have.property('displayname')
              .not.to.be.eq('/newurl1');

            done();
          }
        })
      });
    });

  it('searchPrincipal#');

  it('getGroupMemberSet# should return the right uri\'s', function(done) {
    pInstance.getGroupMemberSet('groups/grp.daniel', function(err, members) {
      if(err) {
        return done(err);
      }
      expect(members).to.be.an('array');
      expect(members).to.be.deep.eq(['principals/me.daniel', 'principals/daniel']);
      done();
    });
  });
  it('getGroupMemberShip# should return an array with group uri\'s', function(done) {
    pInstance.getGroupMemberShip('principals/me.daniel', function (err, groups) {
      if(err) {
        return done(err);
      }
      expect(groups).to.be.an('array');
      expect(groups).to.be.deep.eq(['groups/grp.daniel']);
      done();
    })
  });

  it('setGroupMemberSet# should be able to subscribe groups', function(done) {
    pInstance.setGroupMemberSet('groups/grp.daniel', ['principals/me.daniel'], function(err) {
      if(err) {
        return done(err);
      }
      client.query('SELECT COUNT(*) "cnt" FROM groupmembers WHERE \"group\"=\'groups/grp.daniel\'', function(err, result) {
        expect(result.rows[0].cnt).to.be.eq(1);
        done();
      })
    })
  });

  after(function(done) {
    client.end();
    db.cleanup(done);
  });
});
