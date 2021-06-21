import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Prismic from '@prismicio/client';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { Fragment } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const { isFallback } = useRouter();
  const numberOfWords = Math.ceil(
    post?.data.content.reduce((acc, curr) => {
      String.prototype.stripHTML = function () {
        return this.replace(/<.*?>/g, '');
      };

      const wordsOfHeading = curr?.heading.split(' ').length ?? 0;
      acc += wordsOfHeading;

      curr.body.forEach(value => {
        acc += value.text.stripHTML().split(' ').length;
      });

      return acc;
    }, 0) / 200
  );

  if (isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <Head>
        <title>{post?.data?.title} | spacetraveling</title>
      </Head>

      <main>
        <Header />
        <img
          src={post?.data.banner.url}
          alt={post?.data.title}
          className={styles.postImage}
        />
        <div className={styles.content}>
          <h1>{post?.data.title}</h1>
          <ul>
            <li>
              <FiCalendar />
              {format(new Date(post?.first_publication_date), `dd MMM yyyy`, {
                locale: ptBR,
              })}
            </li>
            <li>
              <FiUser />
              {post?.data.author}
            </li>
            <li>
              <FiClock />
              {numberOfWords} min
            </li>
          </ul>
          <div className={styles.postContent}>
            {post?.data.content.map((partPost, index) => (
              <Fragment key={`${partPost.heading}-${String(index)}`}>
                <h2>{partPost.heading}</h2>
                {partPost?.body.map((postBody, index2) => (
                  <div
                    key={`${partPost.heading}-${String(index2)}`}
                    dangerouslySetInnerHTML={{ __html: postBody.text }}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const postsStatic = ['como-utilizar-hooks', 'criando-um-app-cra-do-zero'];

  const posts = await prismic
    .query([Prismic.predicates.at('document.type', 'posts')])
    .then(res =>
      res.results
        .filter(post => postsStatic.includes(post.uid))
        .map(post => ({ params: { slug: post.uid } }))
    );

  return {
    paths: posts,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const responseBody = response.data.content.map(contentCurr =>
    contentCurr.body.map(bodyContent => bodyContent)
  )?.[0];

  const contentPost = response.data.content.map(contentCurr => ({
    heading: contentCurr.heading,
    body: responseBody.map(bodyContent => {
      return { text: RichText.asHtml([bodyContent]) };
    }),
  }));

  const post = {
    first_publication_date: response.first_publication_date,
    data: {
      title: RichText.asText(response.data.title),
      banner: { url: response.data.banner.url },
      author: RichText.asText(response.data.author),
      content: contentPost,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 60,
  };
};
