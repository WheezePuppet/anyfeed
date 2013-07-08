
anyfeed
Stephen Davies (stephen@umw.edu)


+---------------------------+
| Installation Instructions |
+---------------------------+

1) Unpack the contents of anyfeed.zip into a new Web-accessible directory
(e.g., a subdirectory of /var/www or of some user's public_html directory.)


2) Create a database on the MySQL instance of your choice. (I name mine
"anyfeed", but any name will work.) Log on to the MySQL command line (for
instance, via "mysql -p" from Linux command line) and execute these commands:


use anyfeed;    <--- (or whatever your database name is)

CREATE TABLE `users` (
  `username` varchar(20),
  `password` char(40)
);

CREATE TABLE `feeds` (
  `username` varchar(20),
  `num` int(11),
  `feedtitle` varchar(400),
  `feedurl` varchar(400),
  `feedlink` varchar(400)
);

CREATE TABLE `posts` (
  `username` varchar(20),
  `guid` varchar(600)
);


3) Create an account for yourself (and anyone else you'd like). Enter the
following on the MySQL command line:

INSERT INTO users VALUES ('yourusername',SHA1('yourpassword'));

(Substitute your actual desired username and password, of course.)


4) Create a file called .htaccess in the anyfeed directory, and add these 
four lines to it:

SetEnv MYSQL_HOST yourMySQLHost
SetEnv MYSQL_DB yourMySQLDatabaseName
SetEnv MYSQL_USER yourMySQLUsername
SetEnv MYSQL_PASS yourMySQLPassword

(Substitute your actual values for these four variables, of course.)


4) In your browser (Firefox), go to the URL of the anyfeed.html you just
unpacked, and away you go.
