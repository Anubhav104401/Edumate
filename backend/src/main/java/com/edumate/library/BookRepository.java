package com.edumate.library;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Database access for the book catalogue. */
public interface BookRepository extends JpaRepository<Book, Long> {

    @Query("""
            select b from Book b
            where b.campusCode = :campus
              and (:q = '' or lower(b.title) like lower(concat('%', :q, '%'))
                   or lower(b.author) like lower(concat('%', :q, '%')) or b.isbn like concat('%', :q, '%'))
            order by b.title
            """)
    List<Book> search(@Param("campus") String campusCode, @Param("q") String query);
}
