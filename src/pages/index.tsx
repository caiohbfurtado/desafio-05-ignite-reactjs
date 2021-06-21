import { GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import Head from 'next/head';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { RichText } from 'prismic-dom';
import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  async function handleMorePosts() {
    const response = await fetch(postsPagination.next_page).then(res =>
      res.json()
    );
    setNextPage(response.next_page);

    const newPosts = response.results.map(post => {
      return {
        uid: post.uid,
        first_publication_date: format(
          new Date(post.first_publication_date),
          `dd MMM yyyy`,
          { locale: ptBR }
        ),
        data: {
          title: RichText.asText(post.data.title),
          subtitle: post.data.subtitle,
          author: RichText.asText(post.data.author),
        },
      };
    });
    setPosts([...posts, ...newPosts]);
  }

  return (
    <>
      <Head>
        <title>spacetraveling | Início</title>
      </Head>

      <main className={commonStyles.container}>
        <img src="/images/logo.svg" alt="logo" />

        <div className={styles.posts}>
          {posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>

                <div className={styles.info}>
                  <span>
                    <FiCalendar size={20} />
                    <time>{post.first_publication_date}</time>
                  </span>
                  <span>
                    <FiUser size={20} />
                    {post.data.author}
                  </span>
                </div>
              </a>
            </Link>
          ))}
        </div>
        {nextPage && (
          <button
            type="button"
            className={styles.buttonMore}
            onClick={handleMorePosts}
          >
            Carregar mais posts
          </button>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        `dd MMM yyyy`,
        { locale: ptBR }
      ),
      data: {
        title: RichText.asText(post.data.title),
        subtitle: post.data.subtitle,
        author: RichText.asText(post.data.author),
      },
    };
  });

  return {
    props: {
      postsPagination: {
        results: posts,
        next_page: postsResponse.next_page,
      },
    },
  };
};
