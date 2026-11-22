DBMS Lab 2 – College Record Management
📘 Overview
This folder contains my Database Management Systems Lab 2 Practical Assignment, based on a College Record Management database.

The practical focuses on creating and querying a relational database using SQL. A single database containing four main tables — Student, Faculty, Course and Exam — is used to perform different SQL operations and queries.

The assignment consists of 12 questions covering basic SQL operations, data retrieval, joins, subqueries, views, indexing, window functions and Common Table Expressions (CTEs).

🗄️ Database Schema
The College database consists of the following four tables:

Table	Description	Primary Key
Student	Stores student details	student_id
Faculty	Stores faculty information	faculty_id
Course	Stores course details	course_id
Exam	Stores examination records and marks	exam_id
Table Relationships
Course is connected to Faculty through faculty_id.
Exam is connected to Student through student_id.
Exam is connected to Course through course_id.
These relationships are maintained using foreign key constraints.

📝 Topics Covered (12 Questions)
Q. No.	Topic	SQL Concepts
Q1	SQL Operations (DML)	INSERT, UPDATE, DELETE
Q2	Filtering and Sorting	WHERE, ORDER BY
Q3	Grouping and Aggregation	GROUP BY, COUNT, AVG, MAX
Q4	Inner Join	INNER JOIN
Q5	Left Join	LEFT JOIN
Q6	Self Join	Joining a table with itself
Q7	Subquery	NOT IN
Q8	Set Operation	INTERSECT
Q9	Views	CREATE VIEW
Q10	Indexing	B-tree Index
Q11	Window Function	RANK(), PARTITION BY
Q12	CTE Report	WITH clause and multiple CTEs
Total Marks: 25

💻 Practical Implementation
The practical work includes:

Inserting missing examination records, updating student marks and deleting an incorrect record.
Retrieving CSE students and arranging them alphabetically.
Calculating the number of students appearing for each course, average marks and highest marks.
Combining examination, student and course information using INNER JOIN.
Displaying all students, including those who have not appeared in any examination.
Finding pairs of faculty members belonging to the same department using SELF JOIN.
Finding students without examination records using a subquery.
Applying INTERSECT to identify students satisfying two conditions.
Creating a reusable course_report view to display average course marks.
Creating a B-tree index on the course_id column of the Exam table.
Ranking students within each course using the RANK() window function.
Generating a course-wise statistical report using multiple CTEs.
🛠️ Technologies Used
SQL – Database queries and operations.
PostgreSQL – Relational database management system and SQL features used in the practical.
Relational Database Concepts – Primary keys, foreign keys and table relationships.
🎯 Learning Outcomes
Through this practical assignment, I gained experience in:

Performing data manipulation using SQL.
Retrieving and filtering database records.
Applying aggregate functions and grouping.
Understanding different types of joins.
Working with subqueries and set operations.
Creating database views and indexes.
Using window functions for ranking.
Writing structured queries using multiple CTEs.
Understanding relationships between database tables.
📁 Files Included
This folder contains the practical assignment report and supporting files:

File	Description
DBMS_Lab2_Arpit_Patni_2501730111.pdf	Complete Lab 2 practical report
Lab2.1.pdf	Practical question/report file
Lab2.2.pdf	Practical question/report file
Lab2.3.pdf	Practical question/report file
Lab2.4.pdf	Practical question/report file
👨‍💻 Student Details
Name: Pravindra  Singh
Roll Number: 2501730132
Course: B.Tech CSE (AI & ML)
Section: A
University: K.R. Mangalam University, Gurugram
Subject: Database Management System (DBMS)
Lab: 2 – College Record Management

This repository contains my academic practical work completed as part of the DBMS course.
