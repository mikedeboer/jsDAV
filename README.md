Trie.js
=======

My take on an efficient implementation of a Trie in Javascript

Short story
-----------

A Trie is a kind of digital search tree. (See [Knuth1972] for more details on digital search trees.)

[Fredkin1960] introduced the trie terminology, which is abbreviated from "Retrieval".

[Knuth1972] Knuth, D. E. The Art of Computer Programming Vol. 3, Sorting and Searching. Addison-Wesley. 1972.

[Fredkin1960] Fredkin, E. Trie Memory. Communication of the ACM. Vol. 3:9 (Sep 1960). pp. 490-499. 

([source][1])

The trie implementation of [Dennis Byrne][2] served as a starting point and inspiration.

For more information, please take a look at the [Wikipedia article][3]

Usage
-----

Please take a look at the file

      test/test.html

which pretty much explains the things you can do with Trie.js in code.
The test.html file uses a pure JS dataset of 44.830 records, which you can find in

      data/people_44830.js

More information and full documentation of the API can be found in

      docs/index.html




Amsterdam, 2010. Mike de Boer.

[1]: http://linux.thai.net/~thep/datrie/datrie.html
[2]: http://notdennisbyrne.blogspot.com/2008/12/javascript-trie-implementation.html
[3]: http://en.wikipedia.org/wiki/Trie