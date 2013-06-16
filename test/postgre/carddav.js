var postgre = require('../../lib/shared/backends/postgre.js');
var cDav = require('../../lib/CardDAV/backends/postgre.js');
var db = require('./db.js');
var expect = require('chai').expect;
var cI;
var client;
var async = require('asyncjs');

describe('carddav', function () {
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
            cI = cDav.new(client);
            done();
          }
        });   
      }
    });
  });

  it('getAddressBooksForUser#', function(done) {
    cI.getAddressBooksForUser('principals/me.daniel', function(err, list) {
      if(err) {
        done(err);
      }
      expect(list).to.be.an('array')
        .and.to.have.length(1);

      expect(list[0]).to.have.property('id', 1);
      expect(list[0]).to.have.property('uri', 'addr');
      expect(list[0]).to.have.property('principaluri', 'principals/me.daniel');
      expect(list[0]).to.have.property('{DAV:}displayname', null);
      expect(list[0]).to.have.property('{http://calendarserver.org/ns/}getctag', 1);
      expect(list[0]).to.have.property('{urn:ietf:params:xml:ns:carddav}addressbook-description', null);
      expect(list[0]).to.have.property('{urn:ietf:params:xml:ns:carddav}supported-address-data');
      

      done();
    })
  });

  it('updateAddressBook# should fail when setting unallowed properties', function(done) {
    cI.updateAddressBook('1', {'{DAV:}abc': 'addressbook (DISP)'}, function(err, success) {
      if(err) {
        done(err)
      }
      expect(success).to.be.false;
      done();
    });
  });

  it('updateAddressBook# should update the database', function(done) {
    cI.updateAddressBook('1', {'{DAV:}displayname': 'addressbook (DISP)'}, function(err, success) {
      if(err) {
        done(err)
      }
      expect(success).to.be.true;
      client.query('SELECT * FROM addressbooks WHERE id=1', function(err, result) {
        if(err) {
          done(err);
        }
        expect(result.rows).to.be.an('array');
        expect(result.rows[0])
          .to.have.deep.property('id', 1)
        expect(result.rows[0])
          .to.have.deep.property('displayname', 'addressbook (DISP)');
        done();
      });
    });
  });

  it('createAddressBook# should be able to create an addressbook', function(done) {
    cI.createAddressBook('principals/daniel', 'daniel', {}, function(err, result) {
      if(err) {
        return done(err);
      }
      expect(result).to.be.an('array')
        .and.to.be.deep.eq([{
            "id": 4,
            "displayname": null,
            "description": null,
            "principaluri": 'principals/daniel',
            "uri": 'daniel',
            "ctag": 1,
            
        }]);
      var outerResult = result[0];

      client.query('SELECT * FROM addressbooks WHERE uri= \'daniel\' AND principaluri= \'principals/daniel\' ', function(err, result) {
        if(err) {
          return done(err);
        }
        expect(result.rows).to.be.an('array')
          .and.to.have.length(1);
        expect(result.rows[0]).to.be.deep.eq(outerResult);
        done();
      });
    });
  });

  // it('test', function(done) {
  //   var m = require('../../lib/shared/backends/mongo.js');
  //   var cm = m.getConnection({}, function(err, db){
  //     if(err) {
  //       return done(err);
  //     }
  //     db.collection('_test').insert({abc: 'def'}, function(err, docs) {
  //       if(err) {
  //         return done(err);
  //       }
  //       console.log(docs);
  //       done();
  //     });
  //   });
  // });

  it('deleteAddressBook# should be able to delete an addressbook', function(done) {
    cI.deleteAddressBook(2, function(err, success) {
      if(err) {
        return done(err);
      }
      expect(success).to.be.ok;

      client.query('SELECT * from addressbooks WHERE id=2', function(err, result) {
        if(err) {
          return done(err);
        }

        expect(result.rows).to.have.length(0);
        done();
      });

    })
  });
  it('getCards# should be able to successfully retrieve cards from database', function (done) {
    cI.getCards(1, function(err, cards) {
      if(err) {
        return done(err);
      }

      expect(cards).to.be.an('array');
      expect(cards).to.have.length(2);
      expect(cards[0]).to.have.property('uri', 'card01.vcf');
      expect(cards[1]).to.have.property('uri', 'card02.vcf');

      expect(cards[0]).to.have.property('carddata');
      expect(cards[0]).to.have.property('lastmodified');
      done();
    });
  });

  it('getCard# should be able to successfully retrieve a single card from database', function(done) {
    cI.getCard(1, 'card02.vcf', function(err, card) {
      if(err) {
        return done(err);
      }

      expect(card).to.be.an('object')
        .and.to.have.deep.property('lastmodified')
      done();
    })
  });

  it('createCard# should be able to create a card', function(done) {
    cI.createCard(1, 'newcard.vcf', 'BEGIN:VCARD\\nVERSION:4\\nEND:VCARD', function(err, etag) {
      if(err) {
        return done(err);
      }

      client.query('SELECT * FROM cards WHERE uri=\'newcard.vcf\'', function(err, result) {
        if(err) {
          return done(err);
        }

        expect(result.rows).to.have.length(1);
        expect(result.rows[0]).to.be.an('object');

        expect(result.rows[0]).to.have.property('uri', 'newcard.vcf');
        expect(result.rows[0]).to.have.property('addressbookid', 1);
        expect(result.rows[0]).to.have.property('carddata', 'BEGIN:VCARD\\nVERSION:4\\nEND:VCARD');
        expect(result.rows[0]).to.have.property('lastmodified');
        expect(result.rows[0].lastmodified).to.be.closeTo(new Date(), 200);

        done();
      });
    });
  });

  it('updateCard# should be able to update a card', function(done) {
    cI.updateCard(1, 'card02.vcf', 'newdata', function (err, etag) {
      if(err) {
        done(err);
      }

      client.query('SELECT * FROM cards WHERE uri=\'card02.vcf\'', function(err, result) {
        if(err) {
          return done(err);
        }

        expect(result.rows).to.have.length(1);
        expect(result.rows[0]).to.be.an('object');

        expect(result.rows[0]).to.have.property('uri', 'card02.vcf');
        expect(result.rows[0]).to.have.property('addressbookid', 1);
        expect(result.rows[0]).to.have.property('carddata', 'newdata');
        expect(result.rows[0]).to.have.property('lastmodified');
        expect(result.rows[0].lastmodified).to.be.closeTo(new Date(), 200);

        done();
      });

    })
  });

  it('deleteCard# shoudl be able to delete a card', function(done) {
    cI.deleteCard(1, 'card01.vcf', function(err, success) {
      if(err) {
        done(err);
      }

      expect(success).to.be.ok;

      client.query('SELECT * FROM cards WHERE uri= \'card01.vcf\'', function(err, result) {
        if(err) {
          done(err);
        }

        expect(result.rows).to.have.length(0);

        done();
      });
    })
  });

  after(function(done) {
    client.end();
    db.cleanup(done);
  });
});